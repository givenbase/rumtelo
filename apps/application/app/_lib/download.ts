/** Browser download helpers for settings export (client-side from live API data). */

export function downloadTextFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
    const raw =
        value === null || value === undefined
            ? ''
            : typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean' ||
                typeof value === 'bigint'
              ? String(value)
              : JSON.stringify(value);
    if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
}

/** UTF-8 CSV (BOM so Excel recognises encoding). Empty rows → header-only when `headers` given. */
export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
    const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
    if (cols.length === 0) return '';
    const lines = [
        cols.join(','),
        ...rows.map(row => cols.map(header => csvEscape(row[header])).join(',')),
    ];
    return `\uFEFF${lines.join('\n')}`;
}

// --- store-only ZIP (no compression) for multi-CSV bundles -----------------

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index++) {
        let value = index;
        for (let bit = 0; bit < 8; bit++) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
})();

function crc32(bytes: Uint8Array): number {
    let value = 0xffffffff;
    for (let index = 0; index < bytes.length; index++) {
        value = CRC_TABLE[(value ^ bytes[index]!) & 0xff]! ^ (value >>> 8);
    }
    return (value ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
    const out = new Uint8Array(2);
    out[0] = value & 0xff;
    out[1] = (value >>> 8) & 0xff;
    return out;
}

function u32(value: number): Uint8Array {
    const out = new Uint8Array(4);
    out[0] = value & 0xff;
    out[1] = (value >>> 8) & 0xff;
    out[2] = (value >>> 16) & 0xff;
    out[3] = (value >>> 24) & 0xff;
    return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out;
}

export type ZipEntry = { name: string; content: string };

/** Uncompressed ZIP of text files (CSV sheets). */
export function downloadZip(filename: string, entries: ZipEntry[]) {
    const encoder = new TextEncoder();
    const locals: Uint8Array[] = [];
    const centrals: Uint8Array[] = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBytes = encoder.encode(entry.name);
        const data = encoder.encode(entry.content);
        const crc = crc32(data);
        const local = concatBytes([
            u32(0x04034b50),
            u16(20),
            u16(0),
            u16(0),
            u16(0),
            u16(0),
            u32(crc),
            u32(data.length),
            u32(data.length),
            u16(nameBytes.length),
            u16(0),
            nameBytes,
            data,
        ]);
        const central = concatBytes([
            u32(0x02014b50),
            u16(20),
            u16(20),
            u16(0),
            u16(0),
            u16(0),
            u16(0),
            u32(crc),
            u32(data.length),
            u32(data.length),
            u16(nameBytes.length),
            u16(0),
            u16(0),
            u16(0),
            u16(0),
            u32(0),
            u32(offset),
            nameBytes,
        ]);
        locals.push(local);
        centrals.push(central);
        offset += local.length;
    }

    const centralDir = concatBytes(centrals);
    const end = concatBytes([
        u32(0x06054b50),
        u16(0),
        u16(0),
        u16(entries.length),
        u16(entries.length),
        u32(centralDir.length),
        u32(offset),
        u16(0),
    ]);

    const zipBytes = concatBytes([...locals, centralDir, end]);
    // Fresh ArrayBuffer-backed view — required for BlobPart under newer DOM typings.
    const zipCopy = new Uint8Array(zipBytes.byteLength);
    zipCopy.set(zipBytes);
    downloadBlob(filename, new Blob([zipCopy], { type: 'application/zip' }));
}

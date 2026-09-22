/**
 * Generate email-ready PNGs from designer masters using sharp (Lanczos3).
 *
 * Why: masters are multi-megapixel; email needs smaller files. PNG resize with
 * Lanczos3 is the industry default for crisp downscales — no crude sips/bilinear.
 * Output is 3× the CSS display size so retina clients stay sharp.
 *
 * Usage (from repo root):
 *   pnpm --filter @rumtelo/brand email-assets
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoDir = join(root, 'assets/logo');

/** Must stay in sync with EMAIL_LOGO_SIZE in the backend email brand constants. */
const DISPLAY = {
    wordmark: { width: 192, height: 32 },
    icon: { width: 40, height: 38 },
} as const;

/** 3× CSS pixels — crisp on retina without shipping 4k masters. */
const SCALE = 3;

const jobs = [
    {
        src: 'wordmark-on-light.png',
        out: 'wordmark-on-light-email.png',
        width: DISPLAY.wordmark.width * SCALE,
        height: DISPLAY.wordmark.height * SCALE,
    },
    {
        src: 'wordmark-on-dark.png',
        out: 'wordmark-on-dark-email.png',
        width: DISPLAY.wordmark.width * SCALE,
        height: DISPLAY.wordmark.height * SCALE,
    },
    {
        src: 'icon.png',
        out: 'icon-email.png',
        width: DISPLAY.icon.width * SCALE,
        height: DISPLAY.icon.height * SCALE,
    },
] as const;

async function render(job: (typeof jobs)[number]) {
    const input = join(logoDir, job.src);
    const output = join(logoDir, job.out);

    await sharp(input)
        .ensureAlpha()
        .resize({
            width: job.width,
            height: job.height,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: false,
        })
        // PNG is lossless — compressionLevel only affects file size, not fidelity.
        .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: false,
        })
        .toFile(output);

    const meta = await sharp(output).metadata();
    const { size } = await sharp(output)
        .toBuffer()
        .then(b => ({ size: b.length }));
    console.log(
        `✓ ${job.out}  ${meta.width}×${meta.height}  ${(size / 1024).toFixed(1)} KB  (from ${job.src})`
    );
}

await mkdir(logoDir, { recursive: true });
for (const job of jobs) {
    await render(job);
}
console.log(`Done — ${SCALE}× display, Lanczos3, lossless PNG.`);

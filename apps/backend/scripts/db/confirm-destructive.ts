import { createInterface } from 'node:readline';

export function isForceConfirmed(): boolean {
    return (
        process.argv.includes('--yes') ||
        process.argv.includes('-y') ||
        process.env.DB_DROP_CONFIRM === 'yes'
    );
}

export function maskDatabaseUrl(url: string): string {
    try {
        const parsed = new URL(url);
        if (parsed.password) {
            parsed.password = '****';
        }
        return parsed.toString();
    } catch {
        return '(invalid DATABASE_URL)';
    }
}

export function databaseNameFromUrl(url: string): string {
    const parsed = new URL(url);
    const name = parsed.pathname.replace(/^\//, '').split('?')[0];
    if (!name) {
        throw new Error('DATABASE_URL does not contain a database name');
    }
    return name;
}

export async function confirmDestructiveDrop(options: {
    action: string;
    databaseUrl: string;
    target: string;
}): Promise<boolean> {
    if (isForceConfirmed()) {
        return true;
    }

    if (!process.stdin.isTTY) {
        console.error('❌ Refusing destructive drop without confirmation in non-interactive mode.');
        console.error(
            '   Re-run in a terminal, or pass --yes / set DB_DROP_CONFIRM=yes to proceed.'
        );
        return false;
    }

    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const dbName = databaseNameFromUrl(options.databaseUrl);
    const host = new URL(options.databaseUrl).host;
    const isProdLike = nodeEnv === 'production' || nodeEnv === 'staging';

    console.warn('');
    console.warn('⚠️  DESTRUCTIVE OPERATION — THIS CANNOT BE UNDONE');
    console.warn(`   Action:   ${options.action}`);
    console.warn(`   Target:   ${options.target}`);
    console.warn(`   Database: ${dbName}`);
    console.warn(`   Host:     ${host}`);
    console.warn(`   Env:      ${nodeEnv}`);
    console.warn(`   URL:      ${maskDatabaseUrl(options.databaseUrl)}`);
    console.warn('');

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    try {
        if (isProdLike) {
            const answer = await new Promise<string>(resolve => {
                rl.question(`Type the database name "${dbName}" to confirm: `, resolve);
            });
            return answer.trim() === dbName;
        }

        const answer = await new Promise<string>(resolve => {
            rl.question('Are you sure? Type "yes" to continue: ', resolve);
        });
        return answer.trim().toLowerCase() === 'yes';
    } finally {
        rl.close();
    }
}

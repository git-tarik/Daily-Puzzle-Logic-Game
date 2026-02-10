
import { spawnSync } from 'child_process';
import process from 'process';

// Hardcoded safe URL to rule out file reading issues temporarily
const DB_URL = "postgresql://user:pass@localhost:5432/db";

console.log('Running generator with hardcoded URL via env var injection settings...');

const gen = spawnSync('npx.cmd', ['prisma', 'generate', '--schema=prisma-test/schema.prisma'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: DB_URL },
    shell: true
});

if (gen.status !== 0) {
    console.error('Failed');
    process.exit(1);
}
console.log('Success');

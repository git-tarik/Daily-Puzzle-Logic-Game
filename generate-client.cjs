
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Read .env manually
const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Could not read .env file');
    process.exit(1);
}

// 2. Parse DATABASE_URL
let dbUrl = '';
const lines = envContent.split('\n');
for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
        // Remove 'DATABASE_URL='
        let val = trimmed.substring('DATABASE_URL='.length);
        // Remove quotes if present
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.substring(1, val.length - 1);
        }
        dbUrl = val;
        break;
    }
}

if (!dbUrl) {
    console.error('Could not find DATABASE_URL in .env');
    process.exit(1);
}

console.log('Found DATABASE_URL length:', dbUrl.length);

// 3. Run Prisma Generate
console.log('\n--- Running Prisma Generate ---');
const gen = spawnSync('npx.cmd', ['prisma', 'generate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
    shell: true
});

if (gen.status !== 0) {
    console.error('Prisma Generate failed');
    process.exit(1);
}

console.log('Success!');

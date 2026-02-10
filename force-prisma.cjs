
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Read .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// 2. Parse DATABASE_URL
let dbUrl = '';
const lines = envContent.split('\n');
for (const line of lines) {
    if (line.trim().startsWith('DATABASE_URL=')) {
        // Remove 'DATABASE_URL=' and quotes
        let val = line.trim().substring('DATABASE_URL='.length);
        if (val.startsWith('"') && val.endsWith('"')) {
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
// Check leading protocol
console.log('Protocol check:', dbUrl.startsWith('postgresql://') ? 'Valid Protocol' : 'Invalid Protocol');

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

// 4. Run Prisma DB Push
console.log('\n--- Running Prisma DB Push ---');
const push = spawnSync('npx.cmd', ['prisma', 'db', 'push'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
    shell: true
});

if (push.status !== 0) {
    console.error('Prisma DB Push failed');
    process.exit(1);
}

console.log('Success!');

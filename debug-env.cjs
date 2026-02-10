
const { execSync } = require('child_process');
const result = require('dotenv').config();

if (result.error) {
    console.error('Error loading .env:', result.error);
    process.exit(1);
}

console.log('Loaded .env');
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in process.env');
    process.exit(1);
}

console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
// Don't print the full secret, but maybe the protocol to verify
console.log('Protocol:', process.env.DATABASE_URL.split('://')[0]);

try {
    console.log('Running prisma generate...');
    execSync('npx prisma generate', { stdio: 'inherit', env: process.env });

    console.log('Running prisma db push...');
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
} catch (error) {
    console.error('Command failed');
    process.exit(1);
}

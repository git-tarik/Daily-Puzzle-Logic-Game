
const { execSync } = require('child_process');
require('dotenv').config();

const command = process.argv.slice(2).join(' ');

try {
    execSync(command, { stdio: 'inherit', env: process.env });
} catch (error) {
    process.exit(1);
}

// Simple script to generate bcrypt password hash for admin users
// Run with: node generate-password-hash.js

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter password to hash: ', async (password) => {
    if (!password || password.trim() === '') {
        console.log('Error: Password cannot be empty');
        rl.close();
        return;
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        console.log('\n✓ Password hash generated successfully!\n');
        console.log('Hash:', hash);
        console.log('\nUse this in your SQL to create/update admin user:');
        console.log(`INSERT INTO admin_users (username, password_hash) VALUES ('your_username', '${hash}');`);
        console.log(`\nOr to update existing admin:`);
        console.log(`UPDATE admin_users SET password_hash = '${hash}' WHERE username = 'admin';`);
    } catch (error) {
        console.error('Error generating hash:', error);
    }

    rl.close();
});

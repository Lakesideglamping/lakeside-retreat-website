// Script to create admin user for Lakeside Retreat review system
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function createAdmin() {
    try {
        console.log('🔐 Lakeside Retreat Admin User Setup\n');
        
        // Open database
        const db = new sqlite3.Database('./reviews.db', (err) => {
            if (err) {
                console.error('❌ Database connection error:', err.message);
                process.exit(1);
            }
        });

        // Get admin details
        const username = await question('Enter admin username (e.g., sandy): ');
        const email = await question('Enter admin email: ');
        
        // Get password with confirmation
        let password, confirmPassword;
        do {
            password = await question('Enter admin password: ');
            confirmPassword = await question('Confirm admin password: ');
            
            if (password !== confirmPassword) {
                console.log('❌ Passwords do not match. Please try again.\n');
            }
        } while (password !== confirmPassword);

        if (password.length < 6) {
            console.log('❌ Password must be at least 6 characters long.');
            process.exit(1);
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert admin user
        const sql = `
            INSERT OR REPLACE INTO admin_users (username, email, password_hash, role)
            VALUES (?, ?, ?, 'admin')
        `;

        db.run(sql, [username, email, passwordHash], function(err) {
            if (err) {
                console.error('❌ Error creating admin user:', err.message);
                process.exit(1);
            }

            console.log('\n✅ Admin user created successfully!');
            console.log(`Username: ${username}`);
            console.log(`Email: ${email}`);
            console.log(`Admin ID: ${this.lastID}`);
            console.log('\n🌐 You can now login at: http://localhost:10000/admin/login');
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                }
                rl.close();
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Setup error:', error);
        rl.close();
        process.exit(1);
    }
}

// Run the setup
createAdmin().catch(err => {
    console.error('❌ Fatal error:', err);
    rl.close();
    process.exit(1);
});
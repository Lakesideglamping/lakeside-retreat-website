// Script to create default admin user for Lakeside Retreat review system
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

async function setupAdmin() {
    try {
        console.log('🔐 Setting up default admin user for Lakeside Retreat...\n');
        
        // Open database
        const db = new sqlite3.Database('./reviews.db', (err) => {
            if (err) {
                console.error('❌ Database connection error:', err.message);
                process.exit(1);
            }
        });

        // Default admin credentials
        const username = 'sandy';
        const email = 'info@lakesideretreat.co.nz';
        const password = 'lakeside2024';

        console.log('Creating admin user:');
        console.log(`Username: ${username}`);
        console.log(`Email: ${email}`);
        console.log('Password: lakeside2024');

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
            console.log(`Admin ID: ${this.lastID}`);
            console.log('\n🌐 You can now login at:');
            console.log('   URL: http://localhost:10000/admin/login');
            console.log('   Username: sandy');
            console.log('   Password: lakeside2024');
            console.log('\n🔧 Remember to change the password after first login!');
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                }
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Setup error:', error);
        process.exit(1);
    }
}

// Run the setup
setupAdmin().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
import { Sequelize, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const sequelize = new Sequelize(
  'collab_reader',
  'root',
  '1234',
  {
    host: 'localhost',
    port: 3305,
    dialect: 'mysql',
    logging: false
  }
);

async function createAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Add role column if it doesn't exist
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('users');
        
        if (!tableInfo.role) {
            console.log('Adding role column to users table...');
            await queryInterface.addColumn('users', 'role', {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'user'
            });
            console.log('Role column added.');
        } else {
            console.log('Role column already exists.');
        }

        // 2. Create or update admin user
        const adminEmail = 'krivera.chanta3@gmail.com';
        const adminPassword = '1234';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Raw query to check if user exists
        const [users]: any = await sequelize.query(`SELECT id FROM users WHERE email = ?`, {
            replacements: [adminEmail]
        });

        if (users.length > 0) {
            console.log('Admin user exists. Updating password and role...');
            await sequelize.query(`UPDATE users SET passwordHash = ?, role = 'admin' WHERE email = ?`, {
                replacements: [hashedPassword, adminEmail]
            });
            console.log('Admin user updated.');
        } else {
            console.log('Creating admin user...');
            const uuid = require('crypto').randomUUID();
            await sequelize.query(`INSERT INTO users (id, username, email, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`, {
                replacements: [uuid, 'Admin', adminEmail, hashedPassword, 'admin']
            });
            console.log('Admin user created.');
        }

        console.log('Admin script completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();

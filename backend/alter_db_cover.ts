import { sequelize } from './src/config/database';

const alterDb = async () => {
    try {
        await sequelize.query('ALTER TABLE users ADD COLUMN coverUrl VARCHAR(255) NULL;');
        console.log('Database altered successfully: Added coverUrl to users');
        process.exit(0);
    } catch (error) {
        console.error('Error altering database:', error);
        process.exit(1);
    }
};

alterDb();

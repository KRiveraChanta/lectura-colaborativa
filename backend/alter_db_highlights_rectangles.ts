import { sequelize } from './src/config/database';

async function alterDb() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        await sequelize.query('ALTER TABLE highlights ADD COLUMN rectangles TEXT;');
        console.log('Added rectangles column to highlights table');
        
    } catch (error: any) {
        if (error.message && error.message.includes('duplicate column name')) {
            console.log('Column rectangles already exists');
        } else {
            console.error('Unable to connect to the database or alter table:', error);
        }
    } finally {
        await sequelize.close();
    }
}

alterDb();

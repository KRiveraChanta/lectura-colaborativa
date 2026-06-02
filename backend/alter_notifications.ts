import { sequelize } from './src/config/database';

async function updateDB() {
    try {
        await sequelize.authenticate();
        await sequelize.query('ALTER TABLE notifications MODIFY type VARCHAR(255) NOT NULL;');
        console.log("Successfully altered notifications table type to VARCHAR.");
    } catch (e) {
        console.error("Error altering table:", e);
    } finally {
        await sequelize.close();
    }
}
updateDB();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('collab_reader', 'root', '1234', {
    host: 'localhost',
    port: 3305,
    dialect: 'mysql',
    logging: false,
});

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

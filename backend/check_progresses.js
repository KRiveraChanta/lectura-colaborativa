const { Sequelize, DataTypes } = require('sequelize');

const DB_HOST = 'localhost';
const DB_PORT = 3305;
const DB_USER = 'root';
const DB_PASS = '1234';
const DB_NAME = 'collab_reader';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
});

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Conectado a la BD.');
        
        const [results] = await sequelize.query('SELECT * FROM progresses');
        console.log('Todos los progresos:', results);
    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

run();

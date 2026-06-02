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
    logging: console.log,
});

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Conectado a la base de datos.');

        const queryInterface = sequelize.getQueryInterface();
        const tableDesc = await queryInterface.describeTable('users');

        if (!tableDesc.bio) {
            console.log('Agregando columna bio a users...');
            await queryInterface.addColumn('users', 'bio', {
                type: DataTypes.TEXT,
                allowNull: true,
            });
            console.log('Columna bio agregada exitosamente.');
        } else {
            console.log('La columna bio ya existe.');
        }
    } catch (error) {
        console.error('Error alterando la base de datos:', error);
    } finally {
        await sequelize.close();
        console.log('Conexión cerrada.');
    }
}

run();

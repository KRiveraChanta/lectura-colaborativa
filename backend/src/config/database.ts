import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3305', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '1234';
const DB_NAME = process.env.DB_NAME || 'feryna_collab_reader';

// Instancia global de Sequelize
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false, // Cambiar a console.log para ver las consultas SQL
});

/**
 * Función para inicializar la base de datos.
 * Se conecta a MySQL sin especificar base de datos para ejecutar CREATE DATABASE si no existe,
 * y luego autentica la conexión de Sequelize.
 */
export const initDB = async () => {
    try {
        // Conexión genérica a MySQL para crear la BD
        const connection = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASS,
        });
        
        // @ts-ignore
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
        await connection.end();

        // Autenticar la conexión de Sequelize
        await sequelize.authenticate();
        console.log(`Conectado a MySQL exitosamente en ${DB_HOST}:${DB_PORT} (Base de datos: ${DB_NAME})`);
        
    } catch (error) {
        console.error('Error al inicializar la base de datos MySQL:', error);
        throw error; // Lanzar para que el proceso principal falle si no hay BD
    }
};

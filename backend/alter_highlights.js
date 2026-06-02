const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'collab_reader',
        port: process.env.DB_PORT || 3305,
    });

    try {
        await connection.query("ALTER TABLE highlights ADD COLUMN isPublic BOOLEAN DEFAULT false;");
        console.log("Columna isPublic agregada a highlights");
    } catch(err) {
        if(err.code === 'ER_DUP_FIELDNAME') {
            console.log("La columna isPublic ya existe en highlights.");
        } else {
            console.error("Error:", err);
        }
    } finally {
        await connection.end();
    }
}
run();

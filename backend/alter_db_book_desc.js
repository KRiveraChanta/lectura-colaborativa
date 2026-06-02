const mysql = require('mysql2/promise');

async function run() {
  console.log('Connecting to DB...');
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3305,
    user: 'root',
    password: '1234',
    database: 'collab_reader'
  });

  try {
    console.log('Adding description column to books table...');
    await connection.execute(`ALTER TABLE books ADD COLUMN description TEXT NULL`);
    console.log('Successfully added description column.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('description column already exists. Skipping...');
    } else {
      console.error('Error adding column:', error);
    }
  } finally {
    await connection.end();
  }
}

run();

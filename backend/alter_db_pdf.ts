import { sequelize } from './src/config/database';

async function alterDB() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        await sequelize.query("ALTER TABLE books ADD COLUMN format VARCHAR(10) DEFAULT 'txt', ADD COLUMN fileUrl VARCHAR(255);");
        console.log('Altered table successfully');
        process.exit(0);
    } catch (error: any) {
        if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist');
            process.exit(0);
        }
        console.error('Error altering table', error);
        process.exit(1);
    }
}
alterDB();

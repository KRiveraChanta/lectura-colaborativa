const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('collab_reader', 'root', '1234', {
    host: 'localhost',
    port: 3305,
    dialect: 'mysql',
    logging: false
});

const Highlight = sequelize.define('Highlight', {
    id: { type: DataTypes.UUID, primaryKey: true },
    bookId: DataTypes.UUID,
    userId: DataTypes.UUID,
    type: DataTypes.STRING,
    createdAt: DataTypes.DATE
}, { tableName: 'Highlights', timestamps: true });

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        
        const idsToDelete = [
            'a9365381-ac07-41ae-94a5-613dd09bb7a7',
            '1d4405e7-a677-47f1-9c8c-4e5248458809'
        ];
        
        await Highlight.destroy({
            where: { id: idsToDelete }
        });

        console.log(`Deleted annotations: ${idsToDelete.join(', ')}`);
        console.log("Done.");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();

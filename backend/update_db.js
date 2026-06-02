const mysql = require('./node_modules/mysql2/promise');

async function run() {
    const c = await mysql.createConnection({
        host: 'localhost',
        port: 3305,
        user: 'root',
        password: '1234',
        database: 'collab_reader'
    });

    try {
        await c.query('ALTER TABLE book_comments DROP COLUMN parentId;');
    } catch(e) {}

    try {
        await c.query('ALTER TABLE book_comments ADD COLUMN parentId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;');
        console.log('Added parentId to book_comments');
    } catch (e) {
        console.log('parentId might already exist: ', e.message);
    }

    try {
        await c.query('ALTER TABLE book_comments ADD CONSTRAINT fk_book_comments_parent FOREIGN KEY (parentId) REFERENCES book_comments(id) ON DELETE CASCADE;');
        console.log('Added foreign key for parentId');
    } catch (e) {
        console.log('Foreign key might already exist: ', e.message);
    }

    try {
        await c.query(`
            CREATE TABLE IF NOT EXISTS book_comment_reactions (
                id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
                commentId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                userId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                type ENUM('like', 'dislike') NOT NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                UNIQUE KEY unique_reaction (commentId, userId),
                FOREIGN KEY (commentId) REFERENCES book_comments(id) ON DELETE CASCADE,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('Created book_comment_reactions table');
    } catch (e) {
        console.error('Failed to create book_comment_reactions table: ', e.message);
    }

    await c.end();
}

run();

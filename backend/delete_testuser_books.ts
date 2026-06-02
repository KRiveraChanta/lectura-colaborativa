import { initDB } from './src/config/database';
import { User } from './src/models/User';
import { Book } from './src/models/Book';
import { Section } from './src/models/Section';
import { BookAccess } from './src/models/BookAccess';

const run = async () => {
    await initDB();
    const testUser = await User.findOne({ where: { username: 'TestUser' } });
    if (!testUser) {
        console.log('TestUser not found');
        return;
    }

    const books = await Book.findAll({ where: { creatorId: testUser.id } });
    console.log(`Found ${books.length} books by TestUser`);

    for (const book of books) {
        // also delete accesses and sections
        await BookAccess.destroy({ where: { bookId: book.id } });
        await Section.destroy({ where: { bookId: book.id } });
        await book.destroy();
        console.log(`Deleted book: ${book.title}`);
    }

    console.log('Done');
};

run().then(() => {
    console.log('Finished successfully');
}).catch(console.error);

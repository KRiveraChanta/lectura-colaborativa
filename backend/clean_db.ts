import { Book } from './src/models/Book';
import { BookAccess } from './src/models/BookAccess';
import { Section } from './src/models/Section';
import { initDB } from './src/config/database';

const run = async () => {
    await initDB();
    const books = await Book.findAll();
    let orphanedCount = 0;

    for (const book of books) {
        const sections = await Section.count({ where: { bookId: book.id } });
        const accesses = await BookAccess.count({ where: { bookId: book.id } });
        
        if (sections === 0 || accesses === 0) {
            console.log(`Orphaned Book Found: ${book.title} (id: ${book.id}). Sections: ${sections}, Accesses: ${accesses}`);
            await BookAccess.destroy({ where: { bookId: book.id } });
            await Section.destroy({ where: { bookId: book.id } });
            await book.destroy();
            console.log(`Deleted Orphaned Book: ${book.title}`);
            orphanedCount++;
        } else {
            console.log(`Valid Book: ${book.title} (id: ${book.id}). Sections: ${sections}, Accesses: ${accesses}`);
        }
    }

    console.log(`Total orphaned books deleted: ${orphanedCount}`);
    process.exit(0);
};

run().catch(console.error);

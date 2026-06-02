import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import Book from './Book';
import Tag from './Tag';

export class BookTag extends Model {}

BookTag.init({
    bookId: {
        type: DataTypes.UUID,
        references: {
            model: Book,
            key: 'id'
        },
        primaryKey: true
    },
    tagId: {
        type: DataTypes.UUID,
        references: {
            model: Tag,
            key: 'id'
        },
        primaryKey: true
    }
}, {
    sequelize,
    modelName: 'BookTag',
    tableName: 'book_tags',
    timestamps: false,
});

export default BookTag;

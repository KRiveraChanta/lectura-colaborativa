import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import Book from './Book';

export interface BookCommentAttributes {
    id?: string;
    content: string;
    bookId: string;
    userId: string;
    parentId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class BookComment extends Model<BookCommentAttributes> implements BookCommentAttributes {
    public id!: string;
    public content!: string;
    public bookId!: string;
    public userId!: string;
    public parentId?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

BookComment.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    bookId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Book,
            key: 'id',
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        }
    },
    parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'book_comments',
            key: 'id',
        },
        onDelete: 'CASCADE'
    }
}, {
    sequelize,
    modelName: 'BookComment',
    tableName: 'book_comments',
    timestamps: true,
});

User.hasMany(BookComment, { foreignKey: 'userId', as: 'bookComments' });
BookComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Book.hasMany(BookComment, { foreignKey: 'bookId', as: 'bookComments' });
BookComment.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

BookComment.hasMany(BookComment, { foreignKey: 'parentId', as: 'replies' });
BookComment.belongsTo(BookComment, { foreignKey: 'parentId', as: 'parent' });

export default BookComment;

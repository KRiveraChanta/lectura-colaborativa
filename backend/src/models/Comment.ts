import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import Book from './Book';
import Section from './Section';
import User from './User';

export interface CommentAttributes {
    id?: string;
    bookId: string;
    sectionId: string;
    userId: string;
    highlightId?: string;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Comment extends Model<CommentAttributes> implements CommentAttributes {
    public id!: string;
    public bookId!: string;
    public sectionId!: string;
    public userId!: string;
    public highlightId?: string;
    public content!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Comment.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    bookId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Book,
            key: 'id',
        }
    },
    sectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Section,
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
    highlightId: {
        type: DataTypes.UUID,
        allowNull: true,
        // references: { model: Highlight, key: 'id' } // Will be handled by associations to avoid circular deps issue if Highlight uses Comment
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'Comment',
    tableName: 'comments',
    timestamps: true,
});

Book.hasMany(Comment, { foreignKey: 'bookId' });
Comment.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

Section.hasMany(Comment, { foreignKey: 'sectionId' });
Comment.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relación con Highlight se definirá en Highlight.ts si es necesario o aquí.
// Pero omitimos la llave foránea estricta a nivel BD en la definición inicial si hay dependencia circular,
// o la agregamos vía Sequelize.

export default Comment;

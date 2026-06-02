import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import Book from './Book';
import User from './User';

export interface BookAccessAttributes {
    id?: string;
    bookId: string;
    userId: string;
    grantedById: string;
    grantedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export class BookAccess extends Model<BookAccessAttributes> implements BookAccessAttributes {
    public id!: string;
    public bookId!: string;
    public userId!: string;
    public grantedById!: string;
    public readonly grantedAt!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

BookAccess.init({
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
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        }
    },
    grantedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        }
    },
    grantedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    sequelize,
    modelName: 'BookAccess',
    tableName: 'book_access',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['bookId', 'userId']
        }
    ]
});

// Relaciones
Book.hasMany(BookAccess, { foreignKey: 'bookId' });
BookAccess.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

User.hasMany(BookAccess, { foreignKey: 'userId', as: 'accessedBooks' });
BookAccess.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(BookAccess, { foreignKey: 'grantedById', as: 'grantedAccesses' });
BookAccess.belongsTo(User, { foreignKey: 'grantedById', as: 'grantedBy' });

export default BookAccess;

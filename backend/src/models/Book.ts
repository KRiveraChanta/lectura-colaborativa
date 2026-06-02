import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import Tag from './Tag';
import BookTag from './BookTag';

export interface BookAttributes {
    id?: string;
    title: string;
    author: string;
    coverUrl?: string;
    creatorId: string;
    visibility?: 'public' | 'private' | 'restricted';
    showCreatorAnnotations?: boolean;
    isDuplicate?: boolean;
    originalUploaderId?: string | null;
    format?: string;
    fileUrl?: string;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Book extends Model<BookAttributes> implements BookAttributes {
    public id!: string;
    public title!: string;
    public author!: string;
    public coverUrl?: string;
    public creatorId!: string;
    public visibility!: 'public' | 'private' | 'restricted';
    public showCreatorAnnotations!: boolean;
    public isDuplicate!: boolean;
    public originalUploaderId!: string | null;
    public format!: string;
    public fileUrl?: string;
    public description?: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Book.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    format: {
        type: DataTypes.STRING(10),
        defaultValue: 'txt',
    },
    fileUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    coverUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    creatorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        }
    },
    visibility: {
        type: DataTypes.ENUM('public', 'private', 'restricted'),
        defaultValue: 'public',
    },
    showCreatorAnnotations: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isDuplicate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    originalUploaderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'Book',
    tableName: 'books',
    timestamps: true,
});

// Relación entre User y Book
User.hasMany(Book, { foreignKey: 'creatorId' });
Book.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });
Book.belongsTo(User, { foreignKey: 'originalUploaderId', as: 'originalUploader' });

// Relación entre Book y Tag
Book.belongsToMany(Tag, { through: BookTag, foreignKey: 'bookId', as: 'tags' });
Tag.belongsToMany(Book, { through: BookTag, foreignKey: 'tagId', as: 'books' });

export default Book;

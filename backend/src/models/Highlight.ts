import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import Book from './Book';
import Section from './Section';
import User from './User';

export interface HighlightAttributes {
    id?: string;
    bookId: string;
    sectionId: string;
    userId: string;
    color: string;
    type?: string;
    style?: string;
    startIndex: number;
    endIndex: number;
    text: string;
    rectangles?: string;
    isPublic?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Highlight extends Model<HighlightAttributes> implements HighlightAttributes {
    public id!: string;
    public bookId!: string;
    public sectionId!: string;
    public userId!: string;
    public color!: string;
    public type!: string;
    public style!: string;
    public startIndex!: number;
    public endIndex!: number;
    public text!: string;
    public rectangles!: string;
    public isPublic!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Highlight.init({
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
    color: {
        type: DataTypes.STRING,
        defaultValue: '#ffeb3b',
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'bookmark',
    },
    style: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    startIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    endIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    rectangles: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    sequelize,
    modelName: 'Highlight',
    tableName: 'highlights',
    timestamps: true,
});

Book.hasMany(Highlight, { foreignKey: 'bookId' });
Highlight.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

Section.hasMany(Highlight, { foreignKey: 'sectionId' });
Highlight.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

User.hasMany(Highlight, { foreignKey: 'userId' });
Highlight.belongsTo(User, { foreignKey: 'userId', as: 'user' });

import Comment from './Comment';
Highlight.hasMany(Comment, { foreignKey: 'highlightId', as: 'comments' });

export default Highlight;

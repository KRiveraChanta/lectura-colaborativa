import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import Book from './Book';

export interface SectionAttributes {
    id?: string;
    bookId: string;
    sectionIndex: number;
    content: string;
    wordCount: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Section extends Model<SectionAttributes> implements SectionAttributes {
    public id!: string;
    public bookId!: string;
    public sectionIndex!: number;
    public content!: string;
    public wordCount!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Section.init({
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
    sectionIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
    },
    wordCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'Section',
    tableName: 'sections',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['bookId', 'sectionIndex']
        }
    ]
});

// Relación entre Book y Section
Book.hasMany(Section, { foreignKey: 'bookId' });
Section.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

export default Section;

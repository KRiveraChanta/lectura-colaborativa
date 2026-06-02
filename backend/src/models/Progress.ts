import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import Book from './Book';
import User from './User';

export interface ProgressAttributes {
    id?: string;
    bookId: string;
    userId: string;
    currentSectionIndex: number;
    progressPercentage: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Progress extends Model<ProgressAttributes> implements ProgressAttributes {
    public id!: string;
    public bookId!: string;
    public userId!: string;
    public currentSectionIndex!: number;
    public progressPercentage!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Progress.init({
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
    currentSectionIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    progressPercentage: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    }
}, {
    sequelize,
    modelName: 'Progress',
    tableName: 'progresses',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['bookId', 'userId']
        }
    ]
});

Book.hasMany(Progress, { foreignKey: 'bookId' });
Progress.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

User.hasMany(Progress, { foreignKey: 'userId' });
Progress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Progress;

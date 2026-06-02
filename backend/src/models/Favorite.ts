import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import { Book } from './Book';

export class Favorite extends Model {
    public id!: string;
    public userId!: string;
    public bookId!: string;
}

Favorite.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    bookId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Book,
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'Favorite',
    tableName: 'favorites',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'bookId']
        }
    ]
});

// Relaciones
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Book.hasMany(Favorite, { foreignKey: 'bookId', as: 'favorites' });
Favorite.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

export default Favorite;

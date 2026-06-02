import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

export class CustomList extends Model {
    public id!: string;
    public name!: string;
    public userId!: string;
    public visibility!: 'private' | 'friends' | 'public';
}

CustomList.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    visibility: {
        type: DataTypes.ENUM('private', 'friends', 'public'),
        defaultValue: 'private',
    }
}, {
    sequelize,
    modelName: 'CustomList',
    tableName: 'custom_lists',
    timestamps: true,
});

User.hasMany(CustomList, { foreignKey: 'userId', as: 'customLists' });
CustomList.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default CustomList;

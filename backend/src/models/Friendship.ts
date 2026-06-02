import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

export interface FriendshipAttributes {
    id?: string;
    requesterId: string;
    recipientId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt?: Date;
    updatedAt?: Date;
}

export class Friendship extends Model<FriendshipAttributes> implements FriendshipAttributes {
    public id!: string;
    public requesterId!: string;
    public recipientId!: string;
    public status!: 'pending' | 'accepted' | 'rejected';
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Friendship.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    requesterId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        }
    },
    recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending',
    }
}, {
    sequelize,
    modelName: 'Friendship',
    tableName: 'friendships',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['requesterId', 'recipientId']
        }
    ]
});

User.hasMany(Friendship, { foreignKey: 'requesterId', as: 'sentRequests' });
Friendship.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });

User.hasMany(Friendship, { foreignKey: 'recipientId', as: 'receivedRequests' });
Friendship.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

export default Friendship;

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

export interface NotificationAttributes {
    id?: string;
    userId: string;
    senderId?: string;
    type: 'friend_request' | 'book_access';
    message: string;
    read?: boolean;
    relatedId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Notification extends Model<NotificationAttributes> implements NotificationAttributes {
    public id!: string;
    public userId!: string;
    public senderId?: string;
    public type!: 'friend_request' | 'book_access';
    public message!: string;
    public read!: boolean;
    public relatedId?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Notification.init({
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
            key: 'id',
        }
    },
    senderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        }
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    relatedId: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
});

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

export default Notification;

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserAttributes {
    id?: string;
    username: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string;
    coverUrl?: string;
    role?: string;
    bio?: string;
    completedBooksVisibility?: 'public' | 'private' | 'friends';
    createdAt?: Date;
    updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
    public id!: string;
    public username!: string;
    public email!: string;
    public passwordHash!: string;
    public avatarUrl?: string;
    public coverUrl?: string;
    public role!: string;
    public bio?: string;
    public completedBooksVisibility!: 'public' | 'private' | 'friends';
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    coverUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    completedBooksVisibility: {
        type: DataTypes.ENUM('public', 'private', 'friends'),
        allowNull: false,
        defaultValue: 'public',
    }
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
});

export default User;

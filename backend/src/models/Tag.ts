import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface TagAttributes {
    id?: string;
    name: string;
}

export class Tag extends Model<TagAttributes> implements TagAttributes {
    public id!: string;
    public name!: string;
}

Tag.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
}, {
    sequelize,
    modelName: 'Tag',
    tableName: 'tags',
    timestamps: false,
});

export default Tag;

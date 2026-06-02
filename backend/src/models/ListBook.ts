import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import CustomList from './CustomList';
import { Book } from './Book';

export class ListBook extends Model {
    public id!: string;
    public listId!: string;
    public bookId!: string;
}

ListBook.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    listId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: CustomList,
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
    modelName: 'ListBook',
    tableName: 'list_books',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['listId', 'bookId']
        }
    ]
});

CustomList.belongsToMany(Book, { through: ListBook, foreignKey: 'listId', as: 'books' });
Book.belongsToMany(CustomList, { through: ListBook, foreignKey: 'bookId', as: 'lists' });

export default ListBook;

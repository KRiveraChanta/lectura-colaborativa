import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import BookComment from './BookComment';

export interface BookCommentReactionAttributes {
    id?: string;
    commentId: string;
    userId: string;
    type: 'like' | 'dislike';
    createdAt?: Date;
    updatedAt?: Date;
}

export class BookCommentReaction extends Model<BookCommentReactionAttributes> implements BookCommentReactionAttributes {
    public id!: string;
    public commentId!: string;
    public userId!: string;
    public type!: 'like' | 'dislike';
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

BookCommentReaction.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    commentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: BookComment,
            key: 'id',
        },
        onDelete: 'CASCADE'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE'
    },
    type: {
        type: DataTypes.ENUM('like', 'dislike'),
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'BookCommentReaction',
    tableName: 'book_comment_reactions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['commentId', 'userId']
        }
    ]
});

User.hasMany(BookCommentReaction, { foreignKey: 'userId', as: 'commentReactions' });
BookCommentReaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

BookComment.hasMany(BookCommentReaction, { foreignKey: 'commentId', as: 'reactions' });
BookCommentReaction.belongsTo(BookComment, { foreignKey: 'commentId', as: 'comment' });

export default BookCommentReaction;

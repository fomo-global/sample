import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.js';
import { User } from './User.js';

export class Prediction extends Model {}

Prediction.init({
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT, // само предсказание
    allowNull: false,
  },
  lang: {
    type: DataTypes.STRING, // например, 'ru' / 'en', можно брать из user.language_code
    allowNull: true,
  },
  model: {
    type: DataTypes.STRING, // какой LLM
    allowNull: true,
  },
  prompt_version: {
    type: DataTypes.STRING, // вдруг меняешь шаблон промпта — удобно версионировать
    allowNull: true,
  },
  usage_prompt_tokens: DataTypes.INTEGER,
  usage_completion_tokens: DataTypes.INTEGER,
  finish_reason: DataTypes.STRING,
}, {
  sequelize,
  modelName: 'Prediction',
  tableName: 'predictions',
  underscored: true,
  indexes: [
    { fields: ['user_id', 'created_at'] },
  ],
});

Prediction.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Prediction, { foreignKey: 'user_id' });

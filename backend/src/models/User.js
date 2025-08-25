import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.js';

export class User extends Model {}

User.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  telegram_id: { type: DataTypes.TEXT, allowNull: false, unique: true },
  username: DataTypes.TEXT,
  first_name: DataTypes.TEXT,
  last_name: DataTypes.TEXT,
  language_code: DataTypes.TEXT,
  photo_url: DataTypes.TEXT,
  is_premium: DataTypes.BOOLEAN,
  allows_write_to_pm: DataTypes.BOOLEAN,
  token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  sequelize,
  tableName: 'users',
  timestamps: true,
  underscored: true
});

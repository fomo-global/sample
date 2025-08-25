import { Sequelize } from 'sequelize';
import 'dotenv/config';

const {
  POSTGRES_HOST = '127.0.0.1',
  POSTGRES_PORT = '5432',
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD
} = process.env;

export const sequelize = new Sequelize(
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD, 
  {
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT),
    dialect: 'postgres',
    logging: false
});

export async function connectDb() {
  await sequelize.authenticate();
}

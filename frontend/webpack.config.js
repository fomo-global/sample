import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const envParsed = dotenv.config().parsed || {};
const envKeys = Object.keys(envParsed).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(envParsed[next]);
  return prev;
}, {});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env = {}) => {
  const mode = env.mode || 'development';
  const port = Number(env.port || 3000);

  return {
    mode,
    entry: path.resolve(__dirname, 'src', 'index.tsx'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      clean: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public', 'index.html'),
      }),
      new webpack.ProgressPlugin(),
      new webpack.DefinePlugin(envKeys),
    ],
    module: {
      rules: [
        { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
        { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
        { test: /\.(png|jpe?g|gif|svg)$/i, type: 'asset/resource' },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    devtool: 'inline-source-map',
    devServer: {
      port,
      open: true,
      allowedHosts: 'all',
      hot: true,
      historyApiFallback: true,
    },
  };
};

import path, { dirname } from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Mode = 'development' | 'production';
interface Envariebles {
    mode: Mode,
    port: number
}

export default (env: Envariebles) => {
    const config: webpack.Configuration = {
        /**
         * @mode - режим раработки 
         * development | production
         */
        mode: env.mode ?? 'development',
       
        /**
         * @entry - точка входв в приложение 
         * может принимать объект и иметь несколько точек входа 
         */
        entry: path.resolve(__dirname, 'src', 'index.tsx'),
      
        /**
         * @output - сообщает webpack, куда выдавать создаваемые им пакеты 
         */
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].[contenthash].js',
            clean: true,
        },
        
        /**
         * @plugins - плагины
         */
        plugins: [
           new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'public', 'index.html'), }), //чтоб вщять html за шаблон 
           new webpack.ProgressPlugin(), //чтоб показывался ловдер при сборке 
        ],
        
        /**
         * @module - лоадеры
         */
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader"],
                },
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.(png|jpe?g|gif|svg)$/i,
                    type: 'asset/resource',
                },
            ],
        },
        
        /**
         * @resolve
         */
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        
        /**
         * @devtool
         */
        devtool: 'inline-source-map',
       
        /**
         * @devServer
         */
        devServer: {
            port: env.port ?? 3000,
            open: true,
            allowedHosts: 'all',
            hot: true,
            historyApiFallback: true
        },

        node: {
            __dirname: true
        },
    }
    
    return config;
};
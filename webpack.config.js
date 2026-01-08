// webpack.config.js
var path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'bundle.min': './src/main.jsx',
    'bundle': './src/main.jsx',
  },
  output: {
    path: path.resolve(__dirname, './omero_autotag/static/omero_autotag/js'),
    filename: '[name].js',
    library: 'autotagform'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-react', '@babel/preset-env']
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      { 
        test: /\.png$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 100000
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
};

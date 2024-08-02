const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/index.ts',
  target: 'web',
  mode: 'production',
  output: {
    clean: true,
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'SnapAuth',
    libraryTarget: 'umd',
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version),
    }),
  ],
  module: {
    rules: [
      {
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
  },
}

const path = require('path')

module.exports = {
  entry: './src/index.ts',
  target: 'web',
  mode: 'production',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'WebAuthnBiz',
    libraryTarget: 'umd',
  },
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

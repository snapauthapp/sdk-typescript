const path = require('path')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

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
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'json',
      generateStatsFile: true,
    }),
  ],
  resolve: {
    extensions: ['.ts'],
  },
}

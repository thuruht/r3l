const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/worker.ts',
  output: {
    filename: 'worker.js',
    path: path.join(__dirname, 'dist'),
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      fs: false,
      path: false,
      os: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      }
    ],
  },
  plugins: [
    // This is necessary for Cloudflare Workers
    new webpack.ProvidePlugin({
      // Make these modules available as globals
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      // Define any environment variables needed
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    }),
    // NOTE: If you need a build-time replacement for virtual modules (eg. cloudflare:workers)
    // add a NormalModuleReplacementPlugin here pointing at an appropriate stub.
  ],
  optimization: {
    minimize: true,
  },
};

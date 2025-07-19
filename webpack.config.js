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
    // Special handling for cloudflare imports
    new webpack.NormalModuleReplacementPlugin(
      /^cloudflare:workers$/,
      resource => {
        // This effectively makes cloudflare:workers an empty module
        resource.request = path.resolve(__dirname, 'src/stubs/cloudflare-workers-stub.js');
      }
    )
  ],
  optimization: {
    minimize: true,
  },
};

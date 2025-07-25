const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  target: "webworker",
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            // Bypass type checking to avoid issues with Node.js imports
            transpileOnly: true
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  ignoreWarnings: [
    {
      module: /cloudflare:workers/
    }
  ]
};

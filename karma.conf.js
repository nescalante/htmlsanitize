/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */

const { argv } = require('yargs');

if (!process.env.TRAVIS) {
  process.env.CHROME_BIN = require('puppeteer').executablePath();
}

module.exports = function karmaConfig(config) {
  const localConfig = {
    frameworks: [
      'browserify',
      'mocha'
    ],

    port: 5000,

    files: [
      'test/**/*.js',
    ],

    preprocessors: {
      'test/**/*.js': ['browserify']
    },

    browserify: {
      debug: true,
      transform: []
    },

    browserNoActivityTimeout: 240000,

    captureTimeout: 240000,

    logLevel: config.LOG_INFO,

    // just run once by default unless --watch flag is passed
    singleRun: !argv.watch,

    browsers: process.env.TRAVIS ? ['Chrome_travis_ci'] : ['ChromeHeadless'],

    customLaunchers: {
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },

    // Tell karma all the plugins we're going to be using to prevent warnings
    plugins: [
      'karma-browserify',
      'karma-mocha',

      // launchers
      'karma-chrome-launcher',

      // preprocessors
      'karma-sourcemap-loader'
    ]
  };

  config.set(localConfig);
};

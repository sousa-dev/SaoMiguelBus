const appConfig = require('./app.json');

module.exports = ({ config }) => ({
  ...config,
  ...appConfig.expo,
  plugins: [...(appConfig.expo.plugins ?? [])],
});

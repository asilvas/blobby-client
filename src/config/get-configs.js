const getConfig = require('./get-config-by-id');

module.exports = async argv => {
  const configs = typeof argv.config === 'string' ? [argv.config] : Array.isArray(argv.config) ? argv.config : ['local'];

  if (configs.length === 0) {
    // if no config specified, use environment, or fallback to default
    configs.push(argv.configEnv in process.env ? process.env[argv.configEnv] : argv.configDefault);
  }

  const configPromises = configs.map(configName => getConfig(configName, argv));

  return Promise.all(configPromises);
};

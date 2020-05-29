const configShield = require('config-shield');
const path = require('path');
const fs = require('fs');
const json5 = require('json5');
const extend = require('extend');
const lodashSet = require('lodash.set');
const defaultConfig = require('./default-config');

const gConfigs = {};

module.exports = async (configName, argv) => {
  const configDir = path.resolve(argv.configDir);

  const baseConfigPromise = argv.configBase ? loadConfig(configDir, argv.configBase, argv) : null;
  const envConfigPromise = loadConfig(configDir, configName, argv);
  const secureConfigPromise = new Promise((resolve, reject) => {
    if (!argv.secureConfig) return void resolve(null);
    if (!argv.secureFile) return void reject(new Error('secure-config requires associated secure-file. secure-secret not yet supported.'));

    const ext = path.extname(configName);
    const configId = path.basename(configName, ext);

    const secureConfig = configShield.load({
      instance: configId,
      configPath: path.join(argv.secureConfig, configId + '.json'),
      privateKeyPath: argv.secureFile
    }, err => {
      if (err) return void reject(err);

      const config = {};
      // extend secure config into base config
      secureConfig.getKeys().forEach(k => {
        lodashSet(config, k, secureConfig.getProp(k));
      });

      resolve(config);
    });
  });

  const baseConfig = await baseConfigPromise;
  const envConfig = await envConfigPromise;
  const secureConfig = await secureConfigPromise;

  return extend(true, {}, defaultConfig, baseConfig, envConfig, secureConfig);
};

function loadConfig(configDir, configName, argv) {
  // IKNOWRIGHT:
  // there are some minor blocking calls in here, but they should be reasonable
  // being they are once-per-config calls. may refactor with async.auto later
  // to remove all blocking

  let ext = path.extname(configName);
  const configId = path.basename(configName, ext);
  const gConfig = gConfigs[configId];
  if (gConfig) return gConfig; // return global object if already avail  
  let absPath = path.join(configDir, configName);

  return new Promise((resolve, reject) => {
    if (!ext) {
      // auto-detect
      for (var i = 0; i < argv.configExts.length; i++) {
        ext = argv.configExts[i];
        if (fs.existsSync(absPath + ext)) { // found
          absPath += ext;
          break;
        } else { // not found
          ext = null;
        }
      }
      if (!ext) { // ext not detected
        return void reject(new Error('Configuration not found: ' + absPath));
      }
    }
  
    let o;
  
    if (!/\.json5?/.test(ext)) {
      // perform require on commonJS
  
      try {
        o = require(absPath);
        o.id = configId;
        gConfigs[absPath] = o; // store in global object
        return void resolve(o);
      } catch (ex) {
        return void reject(ex);
      }
    }
  
    // for json/json5 files, utilize json5 loader
  
    fs.readFile(absPath, 'utf8', (err, data) => {
      if (err) return void reject(err);
  
      try {
        o = json5.parse(data);
        o.id = configId;
      } catch (ex) {
        return void reject(ex);
      }

      gConfigs[configId] = o; // store in global object
      resolve(o);
    });  
  });
}

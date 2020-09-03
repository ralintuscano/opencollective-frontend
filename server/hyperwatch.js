const hyperwatch = require('@hyperwatch/hyperwatch');
const expressBasicAuth = require('express-basic-auth');
const expressWs = require('express-ws');

const { parseToBooleanDefaultFalse } = require('./utils');

const {
  HYPERWATCH_ENABLED: enabled,
  HYPERWATCH_PATH: path,
  HYPERWATCH_USERNAME: username,
  HYPERWATCH_SECRET: secret,
} = process.env;

const load = async app => {
  if (parseToBooleanDefaultFalse(enabled) !== true) {
    return;
  }

  const { input, lib, modules, pipeline } = hyperwatch;

  // Init

  hyperwatch.init({
    modules: {
      // Expose the status page
      status: { active: true },
      // Expose logs (HTTP and Websocket)
      logs: { active: true },
    },
  });

  // Mount Hyperwatch API and Websocket

  if (secret) {
    // We need to setup express-ws here to make Hyperwatch's websocket works
    expressWs(app);
    const hyperwatchBasicAuth = expressBasicAuth({
      users: { [username || 'opencollective']: secret },
      challenge: true,
    });
    app.use(path || '/_hyperwatch', hyperwatchBasicAuth, hyperwatch.app.api);
    app.use(path || '/_hyperwatch', hyperwatchBasicAuth, hyperwatch.app.websocket);
  }

  // Configure input

  const expressInput = input.express.create({ name: 'Hyperwatch Express Middleware' });

  app.use((req, res, next) => {
    req.ip = req.ip || '::1'; // Fix "Invalid message: data.request should have required property 'address'"
    next();
  });

  app.use((req, res, next) => {
    req.rawLog = req.rawLog || lib.util.createLog(req, res);
    req.getAugmentedLog = async () => {
      if (!req.augmentedLog) {
        let log = req.rawLog;
        for (const key of ['cloudflare', 'agent', 'hostname', 'identity']) {
          log = await modules.get(key).augment(log);
        }
        req.augmentedLog = log;
      }
      return req.augmentedLog;
    };
    next();
  });

  app.use(expressInput.middleware());

  pipeline.registerInput(expressInput);

  // Filter 'main' node

  pipeline
    .getNode('main')
    .filter(log => !log.getIn(['request', 'url']).match(/^\/_/))
    .filter(log => !log.getIn(['request', 'url']).match(/^\/static/))
    .filter(log => !log.getIn(['request', 'url']).match(/^\/api/))
    .registerNode('main');

  // Configure access Logs in dev and production

  const consoleLogOutput = process.env.NODE_ENV === 'development' ? 'console' : 'text';
  pipeline.getNode('main').map(log => console.log(lib.logger.defaultFormatter.format(log, consoleLogOutput)));

  // Start

  modules.beforeStart();

  pipeline.start();
};

module.exports = load;

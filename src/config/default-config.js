module.exports = {
  retry: {
    initialDelayTime: 500,
    times: 3
  },
  cors: {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET',
    'access-control-allow-origin': '*',
    'access-control-max-age': '86400'
  },
  log: {
    warnings: true,
    errors: true
  }
};

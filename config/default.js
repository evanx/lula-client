module.exports = {
  inStreamKeyPrefix: 'in',
  outStreamKeyPrefix: 'out',
  authUrl: 'http://localhost:3001',
  hubUrl: 'ws://localhost:3002',
  xreadCount: 9,
  logger: {
    level: 'info',
  },
  redis: {
    keyPrefix: 'lula-client:',
    url: 'redis://127.0.0.1:6379',
  },
  requestTimeout: 4000,
  blockTimeout: 4000,
  authDelay: 12000,
  syncDelay: 2000,
  popTimeout: 8000,
}

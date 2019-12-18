const lodash = require('lodash')

const poll = app => {
  const monitor = app.monitor.child({ name: 'poll' })
  return async () => {
    const { blockTimeout, exchange, redis } = app
    const id = app.hid
    monitor.assert.string('poll', { id })
    try {
      const res = await exchange({
        type: 'xread',
        payload: {
          id,
          blockTimeout,
        },
      })
      const commands = res.payload.items
        .map(item => {
          const { id, ...fields } = item
          return [id, ...lodash.flatten(Object.entries(fields))]
        })
        .map(command => [
          'xadd',
          `${app.config.inStreamKeyPrefix}:x`,
          ...command,
        ])
      monitor.debug('xadd', { commands })
      await redis.multi(commands).exec()
    } catch (err) {
      monitor.warn('error', { err })
      return { status: 500 }
    }
  }
}

module.exports = poll

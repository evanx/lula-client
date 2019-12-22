const lodash = require('lodash')

const poll = app => {
  const monitor = app.monitor.child({ name: 'poll' })
  return async () => {
    const { blockTimeout, exchange, redis } = app
    const id = app.cid
    monitor.assert.string('poll', { id })
    try {
      const res = await exchange({
        type: 'xread',
        payload: {
          id,
          blockTimeout,
        },
      })
      const { items } = res.payload
      if (items && items.length) {
        const commands = items
          .map(item => {
            const { id, ...fields } = item
            return [id, ...lodash.flatten(Object.entries(fields))]
          })
          .map(command => [
            'xadd',
            `${app.config.inStreamKeyPrefix}:x`,
            ...command,
          ])
        const [item] = items.slice(-1)
        commands.push(['hset', 'client:h', 'id', item.id])
        monitor.debug('xadd', { commands })
        await redis.multi(commands).exec()
        app.cid = item.id
        return true
      }
    } catch (err) {
      monitor.warn('error', { err })
      return { status: 500 }
    }
  }
}

module.exports = poll

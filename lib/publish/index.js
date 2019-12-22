module.exports = (app, monitor) => {
  return async () => {
    const { config, exchange, redis } = app
    try {
      const xreadRes = await redis.xread(
        'count',
        '1',
        'streams',
        `${config.outStreamKeyPrefix}:x`,
        app.hid,
      )
      if (!xreadRes) {
        return { status: 204 }
      }
      const [id, fields] = xreadRes[0][1][0]
      const hubRes = await exchange({
        type: 'xadd',
        payload: { id, fields },
      })
      if (hubRes.status && hubRes.status !== 200) {
        logger.debug(`status:${hubRes.status}`, { hubRes })
      }
      app.hid = id
      monitor.debug('xadd', { id, response: hubRes })
      return true
    } catch (err) {
      monitor.warn('error', { err })
      return { status: 500 }
    }
  }
}

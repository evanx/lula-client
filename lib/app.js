const config = require('config')
const WebSocket = require('ws')
const {
  buildId,
  buildRedis,
  buildServices,
  buildMonitor,
  clock,
  delay,
  endRedis,
} = require('lula-common')

const redis = buildRedis(config.redis)
const monitor = buildMonitor({ redis, config }, { name: 'app' })

const app = { monitor, redis, config }

app.end = async ({ err, source }) => {
  app.monitor.fatal(`exit:${source}`, { err })
  await endRedis(app.redis)
  if (!process.env.TEST_EXIT) {
    process.exit(1)
  }
}

process.on('unhandledRejection', err => {
  app.end({ err, source: 'unhandledRejection' })
})

process.on('uncaughtException', err => {
  console.error(err)
  app.end({ err, source: 'uncaughtException' })
})

const buildWebSocketListeners = app => {
  const monitor = app.monitor.child({ name: 'ws' })
  return {
    open() {
      monitor.info('open')
      if (app.eventHandlers && app.eventHandlers.open) {
        app.eventHandlers.open()
      }
    },
    close() {
      monitor.info('close')
      if (app.eventHandlers && app.eventHandlers.close) {
        app.eventHandlers.close()
      } else {
        app.end({ err: { message: 'close' }, source: 'ws' })
      }
    },
    error(err) {
      monitor.error('error', { err })
      if (app.eventHandlers && app.eventHandlers.error) {
        app.eventHandlers.error(err)
      } else {
        app.end({ err, source: 'ws' })
      }
    },
    async message(messageString) {
      try {
        const message = JSON.parse(messageString)
        if (app.eventHandlers && app.eventHandlers.message) {
          monitor.debug('message', { message })
          await app.eventHandlers.message(message)
        } else {
          monitor.warn('message:handler', { message })
        }
      } catch (err) {
        monitor.warn('message:error', { err })
      }
    },
  }
}

const buildExchange = app => {
  const monitor = app.monitor.child({ name: 'exchange' })
  return async request =>
    new Promise((resolve, reject) => {
      request.id = buildId()
      monitor.debug('request', { request })
      const timeoutId = setTimeout(() => {
        app.eventHandlers = null
        monitor.warn('timeout', { request, response })
        reject({ message: 'exchange timeout', data: { request, response } })
      }, config.requestTimeout)
      app.eventHandlers = {
        message(response) {
          clearTimeout(timeoutId)
          app.eventHandlers = null
          try {
            if (response.type === 'err') {
              monitor.warn('response:error', { request, response })
              reject({ message: response.payload.err.message })
            }
            if (response.id === request.id && response.type === request.type) {
              resolve(response)
            } else {
              monitor.warn('mismatch', { request, response })
            }
          } catch (err) {
            monitor.warn('error', { request, response })
            reject(err)
          }
        },
      }
      app.ws.send(JSON.stringify(request))
    })
}

const setupWebSocket = async app =>
  new Promise((resolve, reject) => {
    const url = `${app.config.hubUrl}/?accessToken=${app.accessToken}`
    app.ws = new WebSocket(url)
    const idRequest = { type: 'id', id: buildId() }
    app.eventHandlers = {
      open() {
        app.ws.send(JSON.stringify(idRequest))
      },
      close() {
        app.eventHandlers = null
        reject({ message: 'close' })
      },
      error(err) {
        app.eventHandlers = null
        reject(err)
      },
      async message(message) {
        app.eventHandlers = null
        if (message.type === 'id' && message.id === idRequest.id) {
          app.hid = message.payload.id
          resolve()
        } else {
          reject({
            message: 'Unexpected response',
            data: { idRequest, message },
          })
        }
      },
    }
    Object.entries(buildWebSocketListeners(app)).forEach(entry =>
      app.ws.on(...entry),
    )
  })

app.start = async ({ fetch, secret }) => {
  monitor.assert.type('start', config, { hubUrl: 'string' })
  monitor.assert.type(
    'start',
    { fetch, secret },
    { fetch: 'function', secret: 'string' },
  )
  app.started = clock()
  app.fetch = fetch
  app.client = await redis.hget('client:h', 'client')
  app.otpSecret = await redis.hget('client:h', 'otpSecret')
  monitor.assert.type('config', app, { client: 'string', otpSecret: 'string' })
  app.services = buildServices(app, {
    login: require('./login'),
    poll: require('./poll'),
    publish: require('./publish'),
    register: require('./register'),
  })
  app.registered = await redis.hget('client:h', 'registered')
  if (!app.registered) {
    while (true) {
      const registerRes = await app.services.register({ secret })
      if (registerRes.status === 200) {
        app.registered = clock()
        await redis.hset('client:h', 'registered', app.registered)
        break
      }
      await delay(config.authDelay)
    }
  }

  while (true) {
    const loginRes = await app.services.login({ secret })
    if (loginRes.status === 200) {
      app.accessToken = loginRes.data.bearerToken
      if (app.accessToken) {
        app.loggedIn = clock()
        break
      }
      app.monitor.warn('no accessToken')
    }
    await delay(config.authDelay)
  }

  await setupWebSocket(app)
  app.exchange = buildExchange(app)

  app.cid = (await redis.hget('client:h', 'id')) || '0-0'
  while (app.ws.readyState === WebSocket.OPEN) {
    await app.services.poll()
    await app.services.publish()
    await delay(config.syncDelay)
  }
  app.end({ source: 'ws', err: { message: `readyState:${app.ws.readyState}` } })
}

module.exports = app

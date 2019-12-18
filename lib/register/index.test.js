const config = require('config')
const { buildRedis, clock, endRedis } = require('../utils')
const { encodeParams } = require('../utils/testing')
const redisClient = buildRedis(config.redis)

describe('register', () => {
  const state = {
    clientId: 'test-client',
    secret: 'test-secret',
    regToken: 'test-regToken',
  }

  beforeAll(async () => {
    state.clientKey = `client:${state.clientId}:h`
    const time = await redisClient.time()
    state.startTimeMs = Math.floor(
      parseInt(time[0]) * 1000 + parseInt(time[1]) / 1000,
    )
    expect(state.startTimeMs).toBeGreaterThan(1555e9)
    expect(state.startTimeMs).toBeLessThan(1999e9)
  })

  beforeEach(async () => {
    await redisClient.del(state.clientKey)
  })

  afterAll(async () => {
    await endRedis(redisClient)
  })

  it('should forbid unregistered', async () => {})
})

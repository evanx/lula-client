const Redis = require('ioredis')

const buildId = () =>
  Math.random()
    .toString(36)
    .slice(2) +
  Math.random()
    .toString(36)
    .slice(1)

const buildPromise = fn =>
  new Promise((resolve, reject) =>
    fn((err, res) => (err ? reject(err) : resolve(res))),
  )

const buildRedis = redisConfig => new Redis(redisConfig)

const clock = () => Date.now()

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const encodeParams = object =>
  Object.entries(object)
    .map(([key, value]) => key + '=' + encodeURIComponent(value))
    .join('&')

const endRedis = redisClient => redisClient.quit()

const multiAsync = async (redis, commands, hook) => {
  const results = await redis.multi(commands).exec()
  const err = results.find(([err]) => err)
  if (err) {
    throw new Error(err)
  }
  const res = results.map(([, res]) => res)
  if (hook) {
    hook({ commands, res })
  }
  return res
}

const spreadRedis = props => {
  const res = {}
  for (let i = 0; i < props.length; i += 2) {
    res[props[i]] = props[i + 1]
  }
  return res
}

module.exports = {
  buildId,
  buildPromise,
  buildRedis,
  clock,
  delay,
  encodeParams,
  endRedis,
  multiAsync,
  spreadRedis,
}

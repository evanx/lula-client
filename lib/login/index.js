const assert = require('assert')
const config = require('config')
const otplib = require('otplib')

const { buildMonitor } = require('lula-common/monitor')
const { encodeParams } = require('lula-common/utils')

const login = ({ client, redis, fetch, otpSecret }) => {
  const monitor = buildMonitor({ redis }, { name: 'login' }, { client })
  return async ({ secret }) => {
    const otp = otplib.authenticator.generate(otpSecret)
    const payload = {
      client,
      otp,
      secret,
    }
    try {
      const res = await fetch(`${config.authUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: encodeParams(payload),
      })
      if (res.status === 200) {
        monitor.debug('200')
        const data = await res.json()
        return { status: res.status, data }
      } else {
        const data = await res.json()
        monitor.debug(res.status, data)
      }
      return { status: res.status }
    } catch (err) {
      monitor.warn('error', { err })
      return { status: 500 }
    }
  }
}

module.exports = login

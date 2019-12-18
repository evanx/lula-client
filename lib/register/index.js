const assert = require('assert')
const config = require('config')
const otplib = require('otplib')

const { buildMonitor } = require('lula-common/monitor')
const { encodeParams } = require('lula-common/utils')

const register = ({ client, redis, fetch, otpSecret }) => {
  const monitor = buildMonitor({ redis }, { name: 'register' }, { client })
  return async ({ secret }) => {
    const otp = otplib.authenticator.generate(otpSecret)
    const payload = {
      client,
      otp,
      secret,
    }
    try {
      const res = await fetch(`${config.authUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: encodeParams(payload),
      })
      if (res.status === 200) {
        monitor.debug('200')
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

module.exports = register

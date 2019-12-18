const assert = require('assert')
const config = require('config')
const otplib = require('otplib')

const { buildMonitor } = require('lula-common/monitor')
const { encodeParams } = require('lula-common/utils')

const publish = ({ ws, redis }) => {
  const monitor = buildMonitor({ redis }, { name: 'publish' })
  return async () => {
    try {
    } catch (err) {
      monitor.warn('error', { err })
      return { status: 500 }
    }
  }
}

module.exports = publish

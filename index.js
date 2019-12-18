const assert = require('assert')

assert(process.env.LULA_SECRET, 'LULA_SECRET')

require('./lib/app').start({
  fetch: require('node-fetch'),
  secret: process.env.LULA_SECRET,
})

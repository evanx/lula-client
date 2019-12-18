const bcrypt = require('bcrypt')

const secret = process.argv[2]

console.log(bcrypt.hashSync(secret, 8))

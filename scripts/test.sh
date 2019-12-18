#!/bin/bash
set -e
[ $NODE_ENV != 'production' ]

echo2() {
  >&2 echo "$*"
}

emoji_hash='#️⃣ '
_h1() {
  echo "\n${emoji_hash} $*"
}

_h2() {
  echo "\n${emoji_hash}${emoji_hash} $*"
}

_warn() {
  echo "\n❌ $*"
}

_review() {
  _h1 'review'
  _h2 'keys'
  redis-cli keys 'lula*'
  _h2 'hgetall lula:client:test-client:h'
  redis-cli hgetall lula:client:test-client:h
  _h2 'hgetall lula-client:client:h'
  redis-cli hgetall lula-client:client:h
  _h2 'xread STREAMS lula-client:out:x 0-0'
  redis-cli xread STREAMS lula-client:out:x 0-0
  _h2 'xread STREAMS lula-client:in:x 0-0'
  redis-cli xread STREAMS lula-client:in:x 0-0
}

_finish() {
  if [ $? -ne 0 ]
  then
    _review
    _warn exit $?
  fi
}

trap _finish EXIT

client='test-client'
optSecret=`node ./scripts/generate-otp-secret.js`
secret=`openssl rand -base64 24`
regDeadline=`node ./scripts/time.js '1h'`
regToken='test-regToken'
regTokenRes=`node ./scripts/bcrypt.js "${regToken}"`

_clear() {
  redis-cli del lula:client:${client}:h
  redis-cli del lula-client:client:h
  redis-cli del lula-client:in:x
  redis-cli del lula-client:out:x
}

_clear

redis-cli hmset lula-client:client:h client "${client}"
redis-cli hmset lula-client:client:h regToken "${regToken}"
redis-cli hmset lula-client:client:h regDeadline "${regDeadline}"
redis-cli hmset lula-client:client:h otpSecret "${optSecret}"

redis-cli hmset lula:client:${client}:h regToken "${regTokenRes}"
redis-cli hmset lula:client:${client}:h regDeadline "${regDeadline}"
redis-cli hmset lula:client:${client}:h otpSecret "${optSecret}"

redis-cli xadd lula-client:out:x 1555000111000-0 type test-out-1 payload '{}' 

_review 

exit 

_xadd() {
  data="${1}"
  echo2 "\n#️⃣ xadd ${data}"
  curl -s  -w '\n' -S -X 'POST' -d "${data}" \
  -H 'Authorization: Bearer abc123' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Accept: application/json" \
  http://127.0.0.1:3000/xadd
}

_seq() {
  echo2 "\n#️⃣ seq"
  curl -s  -w '\n' \
  -H 'Authorization: Bearer abc123' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Accept: application/json" \
  http://127.0.0.1:3000/seq
  echo
}

_xread() {
  id="${1}"
  echo2 "\n#️⃣ xread ${id}"
  curl -s -w '\n' \
  -H 'Authorization: Bearer abc123' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Accept: application/json" \
  http://127.0.0.1:3000/xread/${id}
}

_xreadBlock() {
  id="${1}"
  blockMs="${2}"
  echo2 "\n#️⃣ xread ${id}"
  curl -s -w '\n' \
  -H 'Authorization: Bearer abc123' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Accept: application/json" \
  http://127.0.0.1:3000/xread/${id}?blockMs=${blockMs}
}

_now() {
  node -e "console.log(Date.now())"
}

_duration() {
  node -e "console.log(Date.now() - $1)"
}

_seq |
  grep '^{"seq":"0-0"}'

_xadd 'type=test1&seq=1555000111000-0' | 
  tee /dev/stderr |
  grep '^{"id":'

_xadd 'type=test2&seq=1555000111000-0' | 
  grep '^{"code":409,'

_xadd 'type=test2&seq=1555000111000-1' | 
  grep '^{"id":'

_seq | 
  grep '^{"seq":"1555000111000-1"}'

_xread 0-0 | 
  tee /dev/stderr |
  jq '.items[0].seq' | grep -q 1555000111000-0
_xread 0-0 | 
  tee /dev/stderr |
  jq '.items[1].seq' | grep -q 1555000111001-0

_xread 1555000111000-0 | 
  tee /dev/stderr |
  grep ''

echo '\n#️⃣ redis-cli xread streams lula:in:x 0-0'
redis-cli xread streams lula:in:x 0-0 
redis-cli xread streams lula:in:x 0-0 | grep type -A1 | tail -1 | grep -q '^test2$'

echo '\n#️⃣ redis-cli xrange lula:in:x - +'
redis-cli xrange lula:in:x - + 

echo '\n✅ OK'

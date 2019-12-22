#!/bin/bash
set -e
[ $NODE_ENV != 'production' ]

echo2() {
  >&2 echo "$*"
}

emoji_hash='#️⃣ '
emoji_stop='⏹️ '
emoji_error='❌ '

_h1() {
  echo "\n${emoji_hash} $*"
}

_h2() {
  echo "\n${emoji_stop} $*"
}

_warn() {
  echo "\n${emoji_error} $*"
}

_review() {
  _h1 'review'
  _h2 'keys'
  redis-cli keys 'lula*'
  _h2 'hgetall lula:client:test-client:h'
  redis-cli hgetall lula:client:test-client:h
  _h2 'hgetall lula-client:client:h'
  redis-cli hgetall lula-client:client:h
  _h2 'xread STREAMS lula:out:test-client:x 0-0'
  redis-cli xread STREAMS lula:out:test-client:x 0-0
  _h2 'xread STREAMS lula-client:in:x 0-0'
  redis-cli xread STREAMS lula-client:in:x 0-0
  _h2 'xread STREAMS lula-client:out:x 0-0'
  redis-cli xread STREAMS lula-client:out:x 0-0
  _h2 'xread STREAMS lula-client:in:x 0-0'
  redis-cli xread STREAMS lula-client:in:x 0-0
  _h2 'xread STREAMS lula:in:x 0-0'
  redis-cli xread STREAMS lula:in:x 0-0
}

_del() {
  echo "redis-cli del $*"
  redis-cli del $*
}

_hmset() {
  echo "redis-cli hmset $*"
  redis-cli hmset $* | grep -q '^OK$'
}

_finish() {
  if [ $? -ne 0 ]
  then
    _review
    _warn exit $?
  fi
}

trap _finish EXIT

# config

client='test-client'
optSecret=`node ./scripts/generate-otp-secret.js`
secret=`openssl rand -base64 24`
regDeadline=`node ./scripts/time.js '1h'`
regToken='test-regToken'
regTokenRes=`node ./scripts/bcrypt.js "${regToken}"`

_clear() {
  _del lula:out:${client}:x
  _del lula:in:x
  _del lula:id:h
  _del lula:client:${client}:h
  _del lula-client:client:h
  _del lula-client:in:x
  _del lula-client:out:x
  _del lula-client:count:app:h
}

_clear

_hmset lula-client:client:h client "${client}"
_hmset lula-client:client:h regToken "${regToken}"
_hmset lula-client:client:h regDeadline "${regDeadline}"
_hmset lula-client:client:h otpSecret "${optSecret}"

_hmset lula:client:${client}:h regToken "${regTokenRes}"
_hmset lula:client:${client}:h regDeadline "${regDeadline}"
_hmset lula:client:${client}:h otpSecret "${optSecret}"

redis-cli xadd lula:out:${client}:x 1555000111000-1 type test-hub-out-1 payload '{}' 
redis-cli xadd lula:out:${client}:x 1555000111000-2 type test-hub-out-2 payload '{}' 
redis-cli xadd lula-client:out:x 1555000111000-1 type test-client-out-1 payload '{}' 
redis-cli xadd lula-client:out:x 1555000111000-2 type test-client-out-2 payload '{}' 

_review 

echo '\n✅ OK'

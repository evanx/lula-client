emoji_h2='#️⃣' 
emoji_hr='' 

_redis() {
  echo "$emoji_h2 redis-cli $*"
  redis-cli "$@"
  echo "$emoji_hr"
}

_redis keys 'lula:*'
_redis keys 'lula-client:*'
_redis xrange 'lula-client:in:x' - +
_redis xrange 'lula-client:out:x' - +
_redis xrange 'lula:in:x' - +
_redis xrange 'lula:out:x' - +
_redis hgetall lula-client:client:h
_redis hgetall lula:id:h


index=${1:-3}

emoji_h2='#️⃣'
emoji_hr=''

_redis() {
  echo "$emoji_h2 redis-cli $*"
  redis-cli "$@"
  echo "$emoji_hr"
}

_redis xadd lula:out:test-client:x 1555000111000-$index type test-hub-out-$index payload '{}' 
_redis xadd lula-client:out:x 1555000111000-$index type test-client-out-$index payload '{}' 

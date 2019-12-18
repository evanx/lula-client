const PERIOD = {
  '1m': 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
}

const getDuration = string => PERIOD[string]

const duration = getDuration(process.argv[2])

if (!duration) {
  process.exit(1)
}

console.error({ duration })

console.log(Date.now() + duration)

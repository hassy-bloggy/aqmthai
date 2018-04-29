let keyMirror = require('keymirror')

// const Constants = keyMirror({
//   INFLUX_HOST: null,
//   INFLUX_PORT: null,
// })
const Constants = {}

Constants.INFLUX_HOST = 'INFLUX_HOST'
Constants.INFLUX_PORT = 'INFLUX_PORT'
Constants.INFLUX_USERNAME = 'INFLUX_USERNAME'
Constants.INFLUX_PASSWORD = 'INFLUX_PASSWORD'
Constants.INFLUX_DB_NAME = 'INFLUX_DB_NAME'
Constants.INFLUX_DB_MEASUREMENT = 'INFLUX_DB_MEASUREMENT'

module.exports = Constants

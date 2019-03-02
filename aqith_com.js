let inspect = require('util').inspect
let fetch = require('node-fetch')
let moment = require('moment-timezone')
const Influx = require('influx')
const influx = new Influx.InfluxDB({
  hosts: [{host: 'x.x.co', port: 8086}],
  username: 'x',
  password: 'x',
  database: 'aqithaidb'
})

const fetchDelayMs = 500

let fn = () => {
  fetch('https://app.ubidots.com/api/v1.6/public/insights/5ab3ceeec03f9726fffe7c31/data?tz=Asia/Bangkok')
    .then(res => res.json())
    .then(json => {
      console.log(`len = ${json.data.data[0].length}`)
      const out = json.data.data[0].map((v, idx) => {
        // console.log(inspect(v))
        return {'PM2.5 (ug/m3)': v.value, time: v.timestamp}
      })
      out.forEach((row, idx) => {
        const ts = moment(row.time).toDate()
        delete row.time
        setTimeout(() => {
          // console.log(`writing.... [${stations[stationId]}] [${ts}] -- ${((idx + 1) * 100 / total).toFixed(2)}% [${idx + 1}/${total}] `)
          console.log(`writing pm2.5 at ${ts}`)
          influx.writePoints([
            {
              measurement: 'aqm',
              tags: {
                stationId: 'aqith_com_แม่เหียะ'
              },
              fields: row,
              timestamp: ts,
            }
          ], {
            precision: 's',
            database: 'aqithaidb',
          })
        }, idx * fetchDelayMs)
      })
    })

}

fn()
setInterval(() => {
  fn()
}, 500 * fetchDelayMs * 2)

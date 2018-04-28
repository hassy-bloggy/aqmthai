let fetch = require('node-fetch')
let FormData = require('form-data')
let parse = require('xml-parser')
let inspect = require('util').inspect
let moment = require('moment-timezone')
const stations = require('./stationsDb')

const jobDelayMs = 5000
const insertDbDelayMs = 50

const startDate = '2018-04-20'
const endDate = '2018-12-31'

const influxHost = process.env.INFLUX_HOST
const influxUsername = process.env.INFLUX_USERNAME
const influxPassword = process.env.INFLUX_PASSWORD
const influxDbName = process.env.INFUX_DBNAME
const Influx = require('influx')
const influx = new Influx.InfluxDB({
  hosts: [{host: influxHost, port: 8086}],
  username: influxUsername,
  password: influxPassword,
  database: influxDbName
})

const insertDb = (rows) => {
  const total = rows.length
  rows.forEach((row, idx) => {
    setTimeout(() => {
    }, idx * insertDbDelayMs + 0.2 * (idx * insertDbDelayMs))
  })
}

let params = {
  paramValue: 'CO,NO,NOX,NO2,SO2,O3,PM10,WD,TEMP,RH,SRAD,NRAD,BP,RAIN,WS,THC,PM2.5',
  action: 'showTable',
  reportType: 'Raw',
  startTime: '00:00:00',
  endTime: '00:00:00',
  dataReportType: '_h',
  showNumRow: '100000',
  pageNo: '1',
}

const get = (params) => {
  let body = new FormData()
  let sensorTitleMap
  let stationId = params.stationId
  let stationName = params.stationName
  Object.entries(params).forEach(([key, value]) => body.append(key, value))
  return fetch('http://aqmthai.com/includes/getMultiManReport.php', {
    method: 'POST', body, header: body.getHeaders()
  }).then(res => res.text())
    .then(body => {
      const xml = parse(body)
      const rows = xml.root.children[2].children
      const trHeader = rows.shift().children
      sensorTitleMap = trHeader.map(val => {
        const [field1, field2] = val.content.split('_')
        return field2 || 'time'
      })
      rows.splice(-5) // remove average fields 5 last fields
      return rows
    })
    .then(rows => {
      console.log(`..... ${stationId} has been downloaded, len=${rows.length}.`)
      return rows.map((v) => {
        let c = v.children.shift().content
        let [yyyy, m, d, hh, mm, ss] = c.split(',')
        let dField = moment.tz([yyyy, m - 1, d, hh, mm, ss], 'Asia/Bangkok').toDate()
        let values = v.children.map(v => parseFloat(v.content) || -1)
        return Object.entries([dField, ...values]).reduce((prev, [idx, val]) => {
          prev[sensorTitleMap[idx]] = val
          return prev
        }, {})
      })
    })
}

const bucket = []
const promises = Object.entries(stations).map(([stationId, stationName], majorIdx) => {
  return new Promise((resolve, reject) => {
    const _resolve = (items) => {
      bucket.push(...items)
      return resolve(items)
    }
    setTimeout(() => {
      console.log(`starting job ${majorIdx + 1}/${Object.entries(stations).length } (${stationId})`)
      Object.assign(params, {stationId, endDate, startDate, stationName})
      get(params).then(_resolve).catch(reject)
    }, majorIdx * jobDelayMs)
  })
})

// Promise.all(promises).then(stations => {
//   console.log(`all done. size = ${stations.length}.`)
//   const reducer = (memo, currentValue) => memo + currentValue
//   const arrayLen = stations.map(rows => rows.length)
//   const totalLen = arrayLen.reduce(reducer)
//   console.log(`totalLen = ${totalLen}`)
//   return stations
// })
//   .then(stations => {
//     stations.forEach((stationRecs, idx) => {
//       const len = stationRecs.length
//       setTimeout(() => {
//         console.log(`inserting job = ${idx + 1 / len}`)
//         insertDb(stationRecs)
//       }, idx * len * insertDbDelayMs)
//     })
//   })
//   .catch((err) => {
//     console.log('got error', err)
//   })

createDispatcher = (bucket, intervalTimeMs, fn) => {
  let intervalId
  let ct = 0
  return {
    run: () => {
      console.log(`starting interval time = ${1000 / intervalTimeMs}Hz`)
      intervalId = setInterval(() => {
          if (bucket.length === 0) return
          let row = bucket.shift()
          fn(row)
          ct++
        }, intervalTimeMs
      )
    },
    stop: () => {
      clearInterval(intervalId)
    }
  }
}

const d1 = createDispatcher(bucket, 1000, (row) => {
  const point = {}
  const stationId = row.stationId
  const ts = row.time
  const del = ['time', 'stationId', ' ()']
  // del.forEach(key => delete row[key])
  const _f = Object.entries(row).filter(([key, val]) => val !== -1)
  const _r = _f.reduce((prev, [key, val]) => {
    (prev[key] = val)
    return prev
  }, {})
  console.log(_r)
  // console.log(`stationId = ${ stationId }`)
  // console.log(`writing.... [${stations[stationId]}] [${ts}] -- ${((idx + 1) * 100 / total).toFixed(2)}% [${idx + 1}/${total}] `)
  // influx.writePoints([{
  //   measurement: 'aqm', tags: {stationId: stations[stationId]},
  //   fields: row,
  //   timestamp: ts,
  // }], {precision: 's', database: influxDbName,})
})

d1.run()

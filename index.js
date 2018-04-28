const fetch = require('node-fetch')
const FormData = require('form-data')
const parse = require('xml-parser')
const moment = require('moment-timezone')
const stations = require('./stationsDb')
const ProgressBar = require('progress')

const bar = new ProgressBar('  inserting (:a/:b) [:bar] :percent remaining: :etas', {
  complete: '=',
  incomplete: ' ',
  width: 20,
  total: 100
})

const fetchDelayMs = 40 * 1000
const insertDbDelayMs = 50

const startDate = process.env.START_DATE || '2018-04-20'
const endDate = process.env.END_DATE || '2018-12-31'

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

createDispatcher = (bucket, intervalTimeMs, fn) => {
  let intervalId
  let ct = 0
  let total = 0
  return {
    run: () => {
      console.log(`START DATE = ${startDate}`)
      console.log(`  END DATE = ${endDate}`)
      console.log(`starting interval time = ${1000 / intervalTimeMs}Hz`)
      intervalId = setInterval(() => {
          if (bucket.length === 0) return
          let row = bucket.shift()
          if (Object.keys(row.data).length === 0) return
          ct++
          fn(row, ct, total)
        }, intervalTimeMs
      )
    },
    stop: () => {
      clearInterval(intervalId)
    },
    add: (items) => {
      total += items.length
      bucket.push(...items)
    }

  }
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
  Object.entries(params).forEach(([key, value]) => body.append(key, value))
  bar.interrupt(`start fetching station ${stationId}`)

  return fetch('http://aqmthai.com/includes/getMultiManReport.php', {
    method: 'POST', body, header: body.getHeaders()
  }).then(res => res.text())
    .then(body => {
      const xml = parse(body)
      const rows = xml.root.children[2].children
      const trHeader = rows.shift().children
      sensorTitleMap = trHeader.map(val => {
        const [field1, field2] = val.content.split('_')
        return field2 || '_time'
      })
      rows.splice(-5) // remove average fields 5 last fields
      return rows
    })
    .then(rows => {
      return rows.map(v => {
        let c = v.children.shift().content
        let [yyyy, m, d, hh, mm, ss] = c.split(',')
        let time = moment.tz([yyyy, m - 1, d, hh, mm, ss], 'Asia/Bangkok').toDate()
        let values = v.children.map(v => parseFloat(v.content) || -1)
        let data = Object.entries([time, ...values]).reduce((prev, [idx, val]) => {
          (val !== -1) && (prev[sensorTitleMap[idx]] = val)
          return prev
        }, {})
        delete data._time
        return Object.assign({}, {
          data,
          extra: {
            time: time,
            stationId: stationId,
            stationName: stations[stationId]
          }
        })
      })
    })
    .catch(err => {
      bar.interrupt(`fetch data error at station ${stationId}.`)
    })
}

const bucket = []
let sct = 0

const d1 = createDispatcher(bucket, insertDbDelayMs, (row, ct, total) => {
  const point = Object.assign({}, row.data)
  const {stationId, stationName, time} = row.extra
  influx.writePoints([{
    measurement: 'aqm', tags: {stationId: stationName},
    fields: point,
    timestamp: time,
  }], {
    precision: 's',
    database: influxDbName
  }).then(() => {
    bar.update(ct / total, {a: ct, b: total})
  })
    .catch((err) => {
      console.log(`(${ct}${total}) stationId = ${stationId} write data point failed.`, err.toString())
      console.log(row)
      console.log('--------------------------------')
    })
})

const promises = Object.entries(stations).map(([stationId, stationName], majorIdx) => {
  return new Promise((resolve, reject) => {
    const _resolve = (items) => {
      d1.add(items)
      bar.interrupt(`${sct}/${Object.values(stations).length} received more ${items.length} items from ${stationName}`)
      return resolve(items)
    }
    setTimeout(() => {
      ++sct
      Object.assign(params, {stationId, endDate, startDate, stationName})
      get(params).then(_resolve).catch(reject)
    }, majorIdx * fetchDelayMs + 1000)
  })
})

Promise.all(promises).then(stations => {
  console.log(`all done. size = ${stations.length}.`)
  const arrayLen = stations.map(rows => rows.length)
  const totalLen = arrayLen.reduce((prev, currentValue) => prev + currentValue)
  console.log(`totalLen = ${totalLen}`)
  return stations
})
  .catch((err) => {
    bar.interrupt(`got error >> ${err.toString()}`)
  })

d1.run()

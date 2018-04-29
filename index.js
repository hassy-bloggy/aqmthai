const fetch = require('node-fetch')
const FormData = require('form-data')
const parse = require('xml-parser')
const moment = require('moment-timezone')
const stations = require('./stationsDb')
const ProgressBar = require('progress')
const {createDispatcher, showFiglet, configStore} = require('./utils')
const sequential = require('promise-sequential')
const inquirer = require('inquirer')
const bar = new ProgressBar('  inserting :station (:a/:b) [:bar] :percent remaining: :etas', {
  complete: '=',
  incomplete: ' ',
  width: 20,
  total: 100
})

let influxHost = process.env.INFLUX_HOST
let influxPort = process.env.INFLUX_PORT || 8086
let influxUsername = process.env.INFLUX_USERNAME
let influxPassword = process.env.INFLUX_PASSWORD
let influxDbName = process.env.INFUX_DBNAME

showFiglet()

const promptLogin = () => {
  const questions = [
    {
      name: 'influxHost',
      type: 'input',
      // default: configStore.get(Constants.CONF_USERNAME),
      default: influxHost,
      message: 'Enter your InfluxDB host:',
      validate: function (value) {
        if (value.length) {
          // configStore.set(Constants.CONF_USERNAME, value)
          return true
        } else {
          return 'Please enter your username or e-mail address'
        }
      }
    },
    {
      name: 'influxPassword',
      type: 'password',
      mask: '*',
      default: influxPassword.split('').map(c => '*').join(''),
      message: 'Enter your InfluxDB password:',
      validate: function (value) {
        const marked = influxPassword.split('').map(c => '*').join('')
        if (value.length) {
          if (value === marked) {
            // do nothing
          } else {
            influxPassword = value
          }
          // Utils.set(Constants.CONF_PASSWORD, value)
          return true
        } else {
          return 'Please enter your password'
        }
      }
    }
  ]
  return inquirer.prompt(questions)
}

const login = () => {
  promptLogin().then(answers => {
    console.log('done login', JSON.stringify(answers, null, '  '))
    influx = new Influx.InfluxDB({
      hosts: [{host: influxHost, port: influxPort}],
      username: influxUsername,
      password: influxPassword,
      database: influxDbName
    })
    influx.getMeasurements().then(names => {
      console.log('My measurement names are: ' + names.join(', '))
      showStationsCheckbox().then(answers => {
        console.log(JSON.stringify(answers, null, '  '))
      })
    }).catch(ex => {
      console.log(ex.toString())
      login()
    })
  })
}

login()

const showStationsCheckbox = () => {
  let questions = [
    {
      name: 'choose stations',
      message: 'Select applications to see the detail',
      type: 'checkbox',
      defaultChecked: true,
      paginated: false,
      pageSize: 15,
      choices: Object.entries(stations).map(([value, name]) => { return {value, name, checked: false}}),
      // when: function (answers) {
      //   // console.log('answers', answers)
      //   return answers.Actions === Constants.SHOW_MQTT_DETAIL
      // }
    }]
  return inquirer.prompt(questions)
}

const log = (...args) => bar.interrupt(...args)

const insertDbDelayMs = 100
const startDate = process.env.START_DATE || '2018-04-20'
const endDate = process.env.END_DATE || '2018-12-31'
const Influx = require('influx')
let influx

// console.log(`START DATE = ${startDate}`)
// console.log(`  END DATE = ${endDate}`)

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
  // log(`start fetching station ${stationId}....`)

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
      console.log('...fetch error.')
      log(`fetch data error at station ${stationId}.`)
    })
}

const bucket = []
const fetchBucket = []
let sct = 0

const insertDbDispatcher = createDispatcher(bucket, insertDbDelayMs, {
  pass: row => Object.keys(row.data).length !== 0,
  fn: (row, ct, total) => {
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
      bar.update(ct / total, {a: ct, b: total, station: stationId})
    }).catch((err) => {
      console.log(`(${ct}${total}) stationId = ${stationId} write data point failed.`, err.toString())
      console.log(row)
      console.log('--------------------------------')
    })
  }
})

const d2 = createDispatcher(fetchBucket, 10, {
  fn: (row, ct, total) => {
    console.log('d2 dispatcher', row, ct, total)
  }
})

const promises = Object.entries(stations).map(([stationId, stationName], majorIdx) => {
  return () => new Promise((resolve, reject) => {
    Object.assign(params, {stationId, endDate, startDate, stationName})
    const _resolve = (items) => {
      insertDbDispatcher.add(items)
      log(`${sct}/${Object.values(stations).length} received more ${items.length} items from ${stationName}`)
      resolve(items)
    }
    log(`start fetching ${++sct}...`)
    get(params).then(_resolve).catch(reject)
  })
})

// sequential(promises)
//   .then(res => {
//     log('all requests done.')
//   })
//   .catch(err => {
//     log(`request error = err`)
//   })
//
// // insertDbDispatcher.run()
// // d2.run()

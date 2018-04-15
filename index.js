let fetch = require('node-fetch')
let FormData = require('form-data')
let parse = require('xml-parser')
let inspect = require('util').inspect
let moment = require('moment-timezone')

const Influx = require('influx')
const influx = new Influx.InfluxDB({
  hosts: [{host: 'dustboy.laris.co', port: 8086}],
  username: 'nat',
  password: 'nattan',
  database: 'aqithaidb'
})

// plain text or html
let params = {
  paramValue: 'CO,NO,NOX,NO2,SO2,O3,PM10,WD,TEMP,RH,SRAD,NRAD,BP,RAIN,WS,THC,PM2.5',
  stationId: '35t',
  action: 'showTable',
  reportType: 'Raw',
  endDate: '2018-04-30',
  startDate: '2018-04-15',
  startTime: '00:00:00',
  endTime: '00:00:00',
  dataReportType: '_h',
  showNumRow: '100000',
  pageNo: '1',
}

/* generate form data */
let form = new FormData()
Object.entries(params).forEach(([key, value]) => form.append(key, value))
let headers = form.getHeaders()

let sensorTitle
fetch('http://aqmthai.com/includes/getMultiManReport.php', {
  method: 'POST', body: form, headers
}).then(res => res.text())
  .then(body => {
    const obj = parse(body)
    const rows = obj.root.children[2].children
    const trHeader = rows.shift().children
    sensorTitle = trHeader.map(val => {
      const [field1, field2] = val.content.split('_')
      return field2 || 'time'
    })
    rows.splice(-5) // remove average fields 5 last fields
    return rows
  })
  .then(rows => {
    console.log(`tr tags = ${rows.length}`)
    return rows.map((v) => {
      let out = {}
      let c = v.children.shift().content
      let [y, m, d, hh, mm, ss] = c.split(',')
      let dField = moment.tz([y, m - 1, d, hh, mm, ss], 'Asia/Bangkok').toDate()
      let values = v.children.map(v => parseFloat(v.content) || undefined)
      let z = [dField, ...values]
      z.forEach((sensorValue, idx) => out[sensorTitle[idx]] = sensorValue)
      return out
    })
  })
  .then(rows => {
    console.log(rows)
    // return rows.map((v, idx) => {
    //   let out = {}
    //   out[sensorTitle[idx]] = v
    //   return out
    // })
  })
  .then(rows => {
    // console.log(rows)
  })

// // writeDb
// rows.forEach((row, idx) => {
//   let data = Object.assign({}, row)
//   let ts = data['Date Time'].toDate()
//   let d = data['Date Time']
//   delete data['Date Time']
//   setTimeout(() => {
//     console.log(`writing.... [${d}] -- ${((idx + 1) * 100 / total).toFixed(2)}% [${idx}/${total}] `)
//     influx.writePoints([
//       {
//         measurement: 'aqm',
//         tags: {
//           stationId: params.stationId
//         },
//         fields: data,
//         timestamp: ts,
//       }
//     ], {
//       precision: 's',
//       database: 'aqithaidb',
//     })
//   }, idx * 50)
// })

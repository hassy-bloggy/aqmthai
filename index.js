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
  endDate: '2017-04-30',
  startDate: '2016-04-15',
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

fetch('http://aqmthai.com/includes/getMultiManReport.php', {
  method: 'POST', body: form, headers
}).then(res => res.text())
  .then(body => {
    const obj = parse(body)
    const trTags = obj.root.children[2].children
    const trHeader = trTags.shift().children
    const sensorTitle = trHeader.map(val => {
      const [field1, field2] = val.content.split('_')
      return (field2 || field1)
    })

    // remove average fields
    trTags.pop()
    trTags.pop()
    trTags.pop()
    trTags.pop()
    trTags.pop()
    let total = trTags.length
    console.log(`found ${total} rows`)

    let rows = trTags.map((v) => {
      let out = {}
      v.children.forEach((v, idx) => {
        let content = v.content
        if (idx === 0) {
          const fck = content.split(',').map(v => parseInt(v, 10))
          fck [1] -= 1
          content = moment.tz(fck, 'Asia/Bangkok')
        }
        else {
          content = parseFloat(content) || 0
        }
        out[sensorTitle[idx]] = content
      })
      return out
    })

    rows.forEach((row, idx) => {
      let data = Object.assign({}, row)
      let ts = data['Date Time'].toDate()
      let d = data['Date Time']
      delete data['Date Time']
      setTimeout(() => {
        console.log(`writing.... [${d}] -- ${((idx + 1) * 100 / total).toFixed(2)}% [${idx}/${total}] `)
        influx.writePoints([
          {
            measurement: 'aqm',
            tags: {
              stationId: params.stationId
            },
            fields: data,
            timestamp: ts,
          }
        ], {
          precision: 's',
          database: 'aqithaidb',
        })
      }, idx * 50)
    })
  })

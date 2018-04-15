let fetch = require('node-fetch')
let FormData = require('form-data')
let parse = require('xml-parser')
let inspect = require('util').inspect
let moment = require('moment-timezone')
moment().tz('America/Los_Angeles').format()

const Influx = require('influx')
const influx = new Influx.InfluxDB({
  hosts: [{host: 'dustboy.laris.co', port: 8086}],
  username: 'nat',
  password: 'nattan',
  database: 'aqithaidb'
})

// or
// const fetch = require('node-fetch');

// if you are using your own Promise library, set it through fetch.Promise. Eg.

// import Bluebird from 'bluebird';
// fetch.Promise = Bluebird;
// params = params+"action="+action+"&paramValue="+paramValue+"&endDate="+endDate+"&startDate="+startDate+"&stationId="+
//   stationIdValue+"&reportType="+reportType+"&startYearMn="+startYearMn+"&startMonthMn="+startMonthMn+"&endYearMn="+endYearMn+"&endMonthMn="+endMonthMn+
//   "&startTime="+startHour+":"+startMin+":"+startSec+"&endTime="+endHour+":"+endMin+":"+endSec+"&dataReportType="+dataReportType+"&showNumRow="+showNumRow+"&pageNo="+pageNo;

// plain text or html
let form = new FormData()

let params = {
  paramValue: 'CO,NO,NOX,NO2,SO2,O3,PM10,WD,TEMP,RH,SRAD,NRAD,BP,RAIN,WS,THC,PM2.5',
  stationId: '5t',
  action: 'showTable',
  reportType: 'Raw',
  endDate: '2018-04-30',
  startDate: '2017-01-15',
  startMonthMn: '04',
  endMonthMn: '04',
  startTime: '00:00:00',
  endTime: '00:00:00',
  dataReportType: '_h',
  startYearMn: '2018',
  endYearMn: '2018',
  showNumRow: '100000',
  pageNo: '1',
  // action: showTable
//   paramValue: (unable to decode value)
// endDate: 2018-04-30
// startDate: 2018-03-15
// stationId: (unable to decode value)
// reportType: Raw
// startYearMn: 2018
// startMonthMn: 04
// endYearMn: 2018
// endMonthMn: 04
// startTime: 00:00:00
// endTime: 21:31:00
// dataReportType: _h
// showNumRow: 500
// pageNo: 1
}

Object.entries(params).forEach(([key, value]) => form.append(key, value))

let f = `action=showTable&paramValue=${params.paramValue}%%&endDate=${params.endDate}&startDate=${params.startDate}`
f += `&stationId=${params.stationId},%%&reportType=${params.reportType}&startYearMn=${params.startYearMn}`
f += `&startMonthMn=${params.startMonthMn}&endYearMn=${params.endYearMn}&endMonthMn=${params.endMonthMn}`
f += `&startTime=${params.startTime}&endTime=${params.endTime}&dataReportType=${params.dataReportType}`
f += `&showNumRow=${params.showNumRow}&pageNo=${params.pageNo}`

let headers = form.getHeaders()
// headers = {'Content-Type': 'application/x-www-form-urlencoded',}
// form = f

fetch('http://aqmthai.com/includes/getMultiManReport.php', {
  method: 'POST', body: form, headers
}).then(res => res.text())
  .then(body => {
    // console.log(body)
    const obj = parse(body)
    const trTags = obj.root.children[2].children
    const trHeader = trTags.shift().children
    // remove average fields
    console.log(`found ${trTags.length} rows`)
    // console.log(inspect(trTags, {colors: true, depth: Infinity}))
    // console.log(getContent(trTags[0]).children)
    const sensorTitle = trHeader.map(val => {
      const [field1, field2] = val.content.split('_')
      return (field2 || field1)
    })

    trTags.pop()
    trTags.pop()
    trTags.pop()
    trTags.pop()
    trTags.pop()

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
        // return {[`${sensorTitle[idx]}`]: content}
      })
      return out
    })

    rows.forEach((row, idx) => {
      // console.log(idx, 'row', row)
      let data = Object.assign({}, row)
      let ts = data['Date Time'].toDate()
      delete data['Date Time']
      setTimeout(() => {
        let i = idx
        console.log(`writing.... no ${i}`)
        influx.writePoints([
          {
            measurement: 'aqm',
            tags: {
              // host: 'aqmthai.com',
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
    // console.log(rows)
    // console.log(sensorTitle)
    // console.log(trTags)
    // trTags.forEach((row, idx) => {
    //   console.log(`${row.children[0].content}`)
    // })
  })

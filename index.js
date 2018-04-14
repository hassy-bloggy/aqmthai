let fetch = require('node-fetch')
let FormData = require('form-data')
let parse = require('xml-parser')
let inspect = require('util').inspect
const URLSearchParams = require('url').URLSearchParams

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
form.append('action', 'showTable')
form.append('stationId', '35t')
form.append('reportType', 'Raw') //
form.append('endDate', '2018-04-14')
form.append('startDate', '2018-04-14')
form.append('startYearMn', '2018')
form.append('endYearMn', '2018') //
form.append('startMonthMn', '04')
form.append('endMonthMn', '04') //
form.append('startTime', '00:00:00')
form.append('endTime', '20:00:00') //
form.append('dataReportType', '_h')
form.append('paramValue', '')
form.append('showNumRow', '500')
form.append('pageNo', '1')
form.append('paramValue', 'CO,NO,NOX,NO2,SO2,O3,PM10,WD,TEMP,RH,SRAD,NRAD,BP,RAIN,WS,THC,PM2.5')

let params = {
  paramValue: 'CO,NO,NOX,NO2,SO2,O3,PM10,WD,TEMP,RH,SRAD,NRAD,BP,RAIN,WS,THC,PM2.5',
  stationId: '36t',
  action: 'showTable',
  reportType: 'Raw',
  endDate: '2018-04-14',
  startDate: '2018-04-14',
  startYearMn: '2018',
  endYearMn: '2018',
  startMonthMn: '04',
  endMonthMn: '04',
  startTime: '00:00:00',
  endTime: '20:00:00',
  dataReportType: '_h',
  showNumRow: '500',
  pageNo: '1',

}

let f = `action=showTable&paramValue=${params.paramValue}%%&endDate=${params.endDate}&startDate=${params.startDate}`
f += `&stationId=${params.stationId},%%&reportType=${params.reportType}&startYearMn=2018&startMonthMn=04&endYearMn=2018&endMonthMn=04&startTime=00:00:00&endTime=21:31:00&dataReportType=_h&showNumRow=500&pageNo=1&startDateTimeCurrPage=undefined&endDateTimeCurrPage=undefine`

let headers = form.getHeaders()
// let headers = {'Content-Type': 'application/x-www-form-urlencoded',}
// form = f

fetch('http://aqmthai.com/includes/getMultiManReport.php', {
  method: 'POST', body: form, headers
}).then(res => res.text())
  .then(body => {
    console.log(body)
    const obj = parse(body)
    const trTags = obj.root.children[2].children
    console.log(`found ${trTags.length} rows`)
    console.log(inspect(trTags, {colors: true, depth: Infinity}))
    trTags.forEach((row, idx) => {
      console.log(`${row.children[0].content}`)
    })
  })

// curl --silent 'http://aqmthai.com/includes/getMultiManReport.php' --data '&startYearMn=2018&startMonthMn=04&endYearMn=2018&endMonthMn=04&startTime=00:00:00&endTime=20:00:00&dataReportType=_h&showNumRow=500&pageNo=1'  | html-beautify
// curl 'http://aqmthai.com/includes/getMultiManReport.php' --data 'action=showTable&paramValue=CO,NO,NOX,NO2,SO2,O3,PM10,WD,TEMP,RH,SRAD,NRAD,BP,RAIN,WS,THC,PM2.5%%&endDate=2018-04-14&startDate=2018-04-14&stationId=35t,%%&reportType=Raw&startYearMn=2018&startMonthMn=04&endYearMn=2018&endMonthMn=04&startTime=00:00:00&endTime=21:31:00&dataReportType=_h&showNumRow=500&pageNo=1&startDateTimeCurrPage=undefined&endDateTimeCurrPage=undefined' --compressed

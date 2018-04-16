let fetch = require('node-fetch')
let FormData = require('form-data')
let parse = require('xml-parser')
let inspect = require('util').inspect
let moment = require('moment-timezone')
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

console.log(process.env)

const insertDb = rows => {
  const total = rows.length
  const delayMs = 50
  rows.forEach((row, idx) => {
    const stationId = row.stationId
    const ts = row.time
    delete row.time
    delete row.stationId
    setTimeout(() => {
      console.log(`writing.... [${stations[stationId]}] [${ts}] -- ${((idx + 1) * 100 / total).toFixed(2)}% [${idx + 1}/${total}] `)
      influx.writePoints([
        {
          measurement: 'aqm',
          tags: {
            stationId: stations[stationId]
          },
          fields: row,
          timestamp: ts,
        }
      ], {
        precision: 's',
        database: 'aqmthai_comdb',
      })
    }, idx * delayMs)
  })
}

const endDate = '2017-12-31'
const startDate = '2017-01-01'

let stations = {
  '03t': '03t ริมถนนกาญจนาภิเษก เขตบางขุนเทียน กรุงเทพ',
  '05t': '05t แขวงบางนา เขตบางนา กรุงเทพ',
  '08t': '08t ต.ทรงคนอง อ.พระประแดง จ.สมุทรปราการ',
  '10t': '10t แขวงคลองจั่น เขตบางกะปิ กรุงเทพ',
  '13t': '13t ต.บางกรวย อ.บางกรวย จ.นนทบุรี',
  '17t': '17t ต.ตลาด อ.พระประแดง จ.สมุทรปราการ',
  '19t': '19t ต.บางเสาธง อ.บางเสาธง จ.สมุทรปราการ',
  '21t': '21t ต.ประตูชัย อ.พระนครศรีอยุธยา จ.พระนครศรีอยุธยา',
  '24t': '24t ต.หน้าพระลาน อ.เฉลิมพระเกียรติ จ.สระบุรี',
  '25t': '25t ต.ปากเพรียว อ.เมือง จ.สระบุรี',
  '26t': '26t ต.หน้าเมือง อ.เมือง จ.ราชบุรี',
  '27t': '27t ต.มหาชัย อ.เมือง จ.สมุทรสาคร',
  '28t': '28t ต.ปลวกแดง, อ.ปลวกแดง, จ.ระยอง',
  '30t': '30t ต.ท่าประดู่, อ.เมือง, จ.ระยอง',
  '32t': '32t ต.ทุ่งสุขลา อ.ศรีราชา จ.ชลบุรี',
  '33t': '33t ต.บ่อวิน อ.ศรีราชา จ.ชลบุรี',
  '34t': '34t ต.บ้านสวน อ.เมือง จ.ชลบุรี',
  '35t': '35t ต.ช้างเผือก อ.เมือง จ.เชียงใหม่',
  '36t': '36t ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่',
  '37t': '37t ต.พระบาท อ.เมือง จ.ลำปาง',
  '38t': '38t ต.สบป้าด อ.แม่เมาะ จ.ลำปาง',
  '39t': '39t ต.บ้านดง อ.แม่เมาะ จ.ลำปาง',
  '40t': '40t ต.แม่เมาะ อ.แม่เมาะ จ.ลำปาง',
  '41t': '41t ต.ปากน้ำโพ อ.เมือง จ.นครสวรรค์',
  '42t': '42t ต.มะขามเตี้ย อ.เมือง จ.สุราษฎร์ธานี',
  '43t': '43t ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต',
  '44t': '44t ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา',
  '46t': '46t ต.ในเมือง อ.เมือง จ.ขอนแก่น',
  '47t': '47t ต.ในเมือง อ.เมือง จ.นครราชสีมา',
  '50t': '50t ริมถนนพระรามสี่, เขตปทุมวัน, กรุงเทพ',
  '52t': '52t ริมถนนอินทรพิทักษ์ เขตธนบุรี กรุงเทพ',
  '53t': '53t ริมถนนลาดพร้าว เขตวังทองหลาง กรุงเทพ',
  '57t': '57t ต.เวียง อ.เมือง จ.เชียงราย',
  '58t': '58t ต.จองคำ อ.เมือง จ.แม่ฮ่องสอน',
  '59t': '59t แขวงพญาไท เขตพญาไท กรุงเทพ',
  '60t': '60t ต.วังเย็น อ.แปลงยาว จ.ฉะเชิงเทรา',
  '61t': '61t แขวงพลับพลา เขตวังทองหลาง กรุงเทพ',
  '62t': '62t ต.บางนาค อ.เมือง จ.นราธิวาส',
  '63t': '63t ต.สะเตง อ.เมือง จ.ยะลา',
  '67t': '67t ต.ในเวียง อ.เมือง จ.น่าน',
  '68t': '68t ต.ในเมือง อ.เมือง จ.ลำพูน',
  '69t': '69t ต.นาจักร อ.เมือง จ.แพร่',
  '70t': '70t ต.เวียง อ.เมือง จ.พะเยา',
  '71t': '71t ต.อรัญประเทศ อ.อรัญประเทศ จ.สระแก้ว',
  '72t': '72t ต.นาอาน อ.เมือง จ.เลย',
  '73t': '73t ต.เวียงพางคำ, อ.แม่สาย, จ.เชียงราย',
  '74t': '74t ต.เนินพระ อ.เมือง จ.ระยอง',
  '75t': '75t ต.ห้วยโก๋น อ.เฉลิมพระเกียรติ จ.น่าน',
  '76t': '76t ต.แม่ปะ อ.แม่สอด จ.ตาก',
  '77t': '77t ต.ท่าตูม อ.ศรีมหาโพธิ จ.ปราจีนบุรี',
  '79t': '79t ต.ปากแพรก อ.เมือง จ.กาญจนบุรี',
  '80t': '80t ต.พิมาน อ.เมือง จ.สตูล',
  'a29': 'a29 ต.มาบตาพุด, อ.เมือง, จ.ระยอง',
  'a31': 'a31 ต.ห้วยโป่ง อ.เมือง จ.ระยอง',
  // 'm8': 'm8 หน่วยตรวจวัดเคลื่อนที่ 8 ค่ายมหาสุรสิงหนาท จ.ระยอง (เริ่ม 19 เมษายน 60)',
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
      // console.log(`${params.stationName} found ${rows.length} data points.`)
      console.log(`..... ${stationId} has been downloaded, len=${rows.length}.`)
      return rows.map((v) => {
        let row = {}
        let c = v.children.shift().content
        let [yyyy, m, d, hh, mm, ss] = c.split(',')
        let dField = moment.tz([yyyy, m - 1, d, hh, mm, ss], 'Asia/Bangkok').toDate()
        let values = v.children.map(v => parseFloat(v.content) || -1)
        let z = [dField, ...values]
        z.forEach((sensorValue, idx) => row[sensorTitleMap[idx]] = sensorValue)
        row.stationId = stationId
        return row
      })
    })
  // .then(insertDb)
}

const promises = Object.entries(stations).map(([stationId, stationName], majorIdx) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(`starting job ${majorIdx + 1}/${Object.entries(stations).length } (${stationId})`)
      Object.assign(params, {stationId, endDate, startDate, stationName})
      get(params).then(resolve).catch(reject)
    }, majorIdx * 5000)
  })
})

Promise.all(promises).then(results => {
  console.log(`all done. size = ${results.length}.`)
  const reducer = (accumulator, currentValue) => accumulator + currentValue
  const lenArray = results.map(item => item.length)
  const totalLen = lenArray.reduce(reducer)
  console.log(`totalLen = ${totalLen}`)
}).catch((err) => {
  console.log('got error', err)
})

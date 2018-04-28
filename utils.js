createDispatcher = (bucket, intervalTimeMs, fn) => {
  let intervalId
  let ct = 0
  let total = 0
  return {
    run: () => {
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

module.exports = {
  createDispatcher
}

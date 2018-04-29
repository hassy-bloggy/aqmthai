const clear = require('clear')
const chalk = require('chalk')
const figlet = require('figlet')
const pkg = require('./package')
const Configstore = require('configstore')

const createDispatcher = (bucket, intervalTimeMs, {pass, fn, finishFn}) => {
  let intervalId
  let ct = 0
  let total = 0
  let started = false
  let finished = false
  return {
    run: () => {
      console.log(`starting dispatcher interval time = ${1000 / intervalTimeMs}Hz`)
      intervalId = setInterval(() => {
          if (bucket.length === 0) {
            if (started && !finished) {
              finished = true
              clearInterval(intervalId)
              finishFn && finishFn()
            }
            return
          }
          let row = bucket.shift()
          started = true
          if (pass && !pass(row)) return
          fn(row, ++ct, total)
        }, intervalTimeMs
      )
    },
    stop: () => {
      clearInterval(intervalId)
    },
    add: (items) => {
      total += items.length
      bucket.push(...items)
    },
    isFinished: () => finished
  }
}

const showFiglet = () => {
  clear()
  let t1 = figlet.textSync(`${pkg.name}.js`, {
    font: 'Fuzzy',
    horizontalLayout: 'full',
    verticalLayout: 'fitted'
  })

  console.log(chalk.magenta(t1))
  console.log(`v${pkg.version}`)
  // console.log(chalk.green(t2))

}

const configStore = new Configstore(pkg.name, {})

module.exports = {
  createDispatcher, showFiglet, configStore
}

const clear = require('clear')
const chalk = require('chalk')
const figlet = require('figlet')
const pkg = require('./package')
const Configstore = require('configstore')

const createDispatcher = (bucket, intervalTimeMs, {pass, fn}) => {
  let intervalId
  let ct = 0
  let total = 0
  return {
    run: () => {
      console.log(`starting interval time = ${1000 / intervalTimeMs}Hz`)
      intervalId = setInterval(() => {
          if (bucket.length === 0) return
          let row = bucket.shift()
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
    }
  }
}

const showFiglet = () => {
  clear()
  let t1 = figlet.textSync(`${pkg.name}.js`, {
    font: 'fuzzy',
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

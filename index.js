const dotTemplate = require('@conjurelabs/dot-template')

let setupCalled = false

// proxy to dotTemplate
module.exports = function pgDotTemplate(path, ...args) {
  if (setupCalled === false) {
    throw new Error('pg-dot-template requires .setup() before usage')
  }
  return dotTemplate(path)(...args)
}

module.exports.setup = function setup() {
  // returns var index references for postgres queries
  // but prints values to console
  dotTemplate.addHandler({
    expressionPrefix: '$PG',
    valueMutator: (value, templateArgs, pgQueryArgs) => {
      const index = pgQueryArgs.indexOf(value)
      return `$${index + 1}`
    },
    logMutator: value => value
  })

  // returns var index references for postgres queries
  // but prints redacted message to console
  dotTemplate.addHandler({
    expressionPrefix: '!PG',
    valueMutator: (value, templateArgs, pgQueryArgs) => {
      const index = pgQueryArgs.indexOf(value)
      return `$${index + 1}`
    },
    logMutator: () => redactionMessage
  })

  setupCalled = true
}

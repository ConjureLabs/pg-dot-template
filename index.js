const dotTemplate = require('@conjurelabs/dot-template')

// proxy to dotTemplate
module.exports = function pgDotTemplate(path, ...args) {
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
}

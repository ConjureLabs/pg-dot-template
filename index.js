const dotTemplate = require('@conjurelabs/dot-template')

const { PG_DOT_TEMPLATE_REDACTION_MESSAGE = '<REDACTED>' } = process.env
let setupCalled = false

// proxy to dotTemplate
module.exports = function pgDotTemplate(path) {
  // enforce path ending in .sql
  path = path.replace(/(?:\.sql)?\s*$/i, '.sql')

  if (setupCalled === false) {
    throw new Error('pg-dot-template requires .setup() before usage')
  }

  const prepare = dotTemplate(path)

  return async (...args) => {
    if (setupCalled === false) {
      throw new Error('pg-dot-template requires .setup() before usage')
    }

    // supporting .text, which pg requires
    const preparedTemplate = await prepare(...args)
    Object.defineProperty(preparedTemplate, 'text', {
      value: preparedTemplate.toString(),
      writable: false,
      enumerable: false
    })
    return preparedTemplate
  }
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
    logMutator: () => PG_DOT_TEMPLATE_REDACTION_MESSAGE
  })

  setupCalled = true
}

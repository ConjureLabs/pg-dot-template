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

  return async (values, ...tailingArgs) => {
    if (setupCalled === false) {
      throw new Error('pg-dot-template requires .setup() before usage')
    }

    const queryArgs = [] // appended as values are evaluated
    const preparedTemplate = await prepare(values, ...tailingArgs, queryArgs)

    // supporting .text, which pg requires
    Object.defineProperty(preparedTemplate, 'text', {
      value: preparedTemplate.toString(),
      writable: false,
      enumerable: false
    })

    // supporting .queryArgs for both the user and query
    Object.defineProperty(preparedTemplate, 'queryArgs', {
      value: queryArgs,
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
    valueMutator: (value, templateArgs, ...tailingArgs) => {
      const [pgQueryArgs] = tailingArgs.slice(-1)
      let index = pgQueryArgs.indexOf(value)

      if (index === -1) {
        index = pgQueryArgs.length
        pgQueryArgs.push(value)
      }

      return `$${index + 1}`
    },
    logMutator: value => value
  })

  // returns var index references for postgres queries
  // but prints redacted message to console
  dotTemplate.addHandler({
    expressionPrefix: '!PG',
    valueMutator: (value, templateArgs, ...tailingArgs) => {
      const [pgQueryArgs] = tailingArgs.slice(-1)
      let index = pgQueryArgs.indexOf(value)

      if (index === -1) {
        index = pgQueryArgs.length
        pgQueryArgs.push(value)
      }

      return `$${index + 1}`
    },
    logMutator: () => PG_DOT_TEMPLATE_REDACTION_MESSAGE
  })

  setupCalled = true
}

const dotTemplate = require('@conjurelabs/dot-template')

const { PG_DOT_TEMPLATE_REDACTION_MESSAGE = '<REDACTED>' } = process.env
let setupCalled = false
let pgConnection

// proxy to dotTemplate
module.exports = function pgDotTemplate(path) {
  // enforce path ending in .sql
  path = path.replace(/(?:\.sql)?\s*$/i, '.sql')

  if (setupCalled === false) {
    throw new Error('pg-dot-template requires .setup() before usage')
  }

  const dotTemplatePrepare = dotTemplate(path)

  const prepare = async (values, ...tailingArgs) => {
    if (setupCalled === false) {
      throw new Error('pg-dot-template requires .setup() before usage')
    }

    const queryArgs = [] // appended as values are evaluated
    const preparedTemplate = await dotTemplatePrepare(values, ...tailingArgs, queryArgs)

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

    // convenient method to query pg
    Object.defineProperty(preparedTemplate, 'query', {
      value: () => {
        if (pgConnection === undefined) {
          throw new ReferenceError('.query expects a valid pg connection to be passed to .setup(connection)')
        }
        return pgConnection.query(preparedTemplate, queryArgs)
      },
      writable: false,
      enumerable: false
    })

    return preparedTemplate
  }

  prepare.query = async (...args) => {
    const preparedTemplate = await preparedTemplate(...args)
    return preparedTemplate.query()
  }

  return prepare
}

function getQueryArgPlaceholder(value, pgQueryArgs) {
  let index = pgQueryArgs.indexOf(value)

  if (index === -1) {
    index = pgQueryArgs.length
    pgQueryArgs.push(value)
  }

  return `$${index + 1}`
}

function getValueType(value) {
  let valueType = typeof value
  if (valueType === 'object') {
    if (value instanceof Date) {
      valueType = 'date'
    } else if (Array.isArray(value)) {
      valueType = 'array'
    }
  }
  return valueType
}


function valueMutator(value, templateArgs, ...tailingArgs) {
  const [pgQueryArgs] = tailingArgs.slice(-1)

  return valuePlaceholders(value, pgQueryArgs)
}

function valuePlaceholders(value, pgQueryArgs, nested = false) {
  const valueType = getValueType(value)

  switch(valueType) {
    case 'array':
      if (nested) {
        throw new TypeError('pg-dot-template does not support nested arrays')
      }
      return value.map(subvalue => valuePlaceholders(subvalue, pgQueryArgs, true)).join(', ')

    case 'date':
    case 'number':
    case 'string':
      return getQueryArgPlaceholder(value, pgQueryArgs)

    default:
      throw new TypeError(`pg-dot-template ${!nested ? '' : 'nested '}expression (${valueType}) had an unexpected value: ${value}`)
  }

  return queryArgIndex
}

// this func does not need to throw,
// since it should have within valuePlaceholders
// by this point
function valuePrinted(value, redacted = false, nested = false) {
  const valueType = getValueType(value)

  switch(valueType) {
    case 'array':
      return value.map(subvalue => valuePrinted(subvalue, redacted, true)).join(', ')
    
    case 'number':
      return redacted ? PG_DOT_TEMPLATE_REDACTION_MESSAGE : value

    default:
      if (redacted) {
        return `'${PG_DOT_TEMPLATE_REDACTION_MESSAGE}'`
      }
      const treatedValue = value.toString().replace(/'/g, '\\\'')
      return `'${treatedValue}'`
  }
}

module.exports.setup = function setup(pgConnectionArg) {
  // if consumer wants to call .query directly on return value
  pgConnection = pgConnectionArg

  // returns var index references for postgres queries
  // but prints values to console
  dotTemplate.addHandler({
    expressionPrefix: '$PG',
    valueMutator: valueMutator,
    logMutator: value => valuePrinted(value)
  })

  // returns var index references for postgres queries
  // but prints redacted message to console
  dotTemplate.addHandler({
    expressionPrefix: '!PG',
    valueMutator: valueMutator,
    logMutator: value => valuePrinted(value, true)
  })

  setupCalled = true
}

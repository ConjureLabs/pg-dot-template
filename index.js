const dotTemplate = require('@conjurelabs/dot-template')
const getType = require('@conjurelabs/get-type')

const { PG_DOT_TEMPLATE_REDACTION_MESSAGE = '<REDACTED>' } = process.env
const noOp = () => {}

// proxy to dotTemplate
module.exports = function pgDotTemplate(path) {
  // enforce path ending in .sql
  path = path.replace(/(?:\.sql)?\s*$/i, '.sql')

  const dotTemplatePrepare = dotTemplate(path)

  const prepare = async (values, ...tailingArgs) => {
    const queryArgs = [] // appended as values are evaluated
    const queryKeys = [] // tracks a 1:1 index for values[propName] to queryArgs

    const preparedTemplate = await dotTemplatePrepare(values, ...tailingArgs, queryArgs, queryKeys)

    // supporting .queryArgs for both the user and query
    Object.defineProperty(preparedTemplate, 'queryArgs', {
      value: queryArgs,
      writable: false,
      enumerable: false
    })

    // convenient method to query pg
    Object.defineProperty(preparedTemplate, 'query', {
      value: (...tailingQueryArgs) => {
        return module.exports.handleQuery(preparedTemplate.toString().slice(), flatten(queryArgs), ...[...tailingArgs, ...tailingQueryArgs])
      },
      writable: false,
      enumerable: false
    })

    return preparedTemplate
  }

  prepare.query = async (values, ...tailingArgs) => {
    const preparedTemplate = await prepare(values, ...tailingArgs)
    return preparedTemplate.query(...tailingArgs)
  }

  return prepare
}

// flattens query args
// assumes nested arrays are shallow
function flatten(arr) {
  const result = []
  for (let value of arr) {
    if (Array.isArray(value)) {
      result.push(...value)
    } else {
      result.push(value)
    }
  }
  return result
}

function valuePlaceholders(value, pgIndex, nested = false) {
  const valueType = getType(value)

  switch(valueType) {
    case 'array':
      if (nested) {
        throw new TypeError('pg-dot-template does not support nested arrays')
      }
      return value.map((subvalue, arrayIndex) => valuePlaceholders(subvalue, pgIndex + arrayIndex, true)).join(', ')

    case 'number':
    case 'boolean':
    case 'null':
    case 'date':
    case 'number':
    case 'bigint':
    case 'string':
      return `$${pgIndex}`

    default:
      throw new TypeError(`pg-dot-template ${!nested ? '' : 'nested '}expression (${valueType}) had an unexpected value: ${value}`)
  }
}

// this func does not need to throw,
// since it should have within valuePlaceholders
// by this point
function valuePrinted(value, redacted = false, nested = false) {
  const valueType = getType(value)

  switch(valueType) {
    case 'array':
      return value.map(subvalue => valuePrinted(subvalue, redacted, true)).join(', ')
    
    case 'number':
    case 'boolean':
      return redacted ? PG_DOT_TEMPLATE_REDACTION_MESSAGE : value

    case 'null':
      return redacted ? PG_DOT_TEMPLATE_REDACTION_MESSAGE : 'NULL'

    case 'date':
      if (redacted) {
        return `'${PG_DOT_TEMPLATE_REDACTION_MESSAGE}'`
      }
      const treatedDate = value.toISOString()
      return `'${treatedDate}'`

    default:
      if (redacted) {
        return `'${PG_DOT_TEMPLATE_REDACTION_MESSAGE}'`
      }
      const treatedValue = value.toString().replace(/'/g, '\\\'')
      return `'${treatedValue}'`
  }
}

class ValueWrapper {
  constructor({ value, valueOfApplied, printed }) {
    this.value = value
    this.printed = printed
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.printed()
  }
}

function getQueryKeysTotalLength(queryKeys) {
  return Object.keys(queryKeys).reduce((count, key) => {
    return count + (
      Array.isArray(queryKeys[key]) ? queryKeys[key].length : 1
    )
  }, 0)
}

// returns var index references for postgres queries
// but prints values to console
dotTemplate.addHandler({
  expressionPrefix: '$PG',
  valuesObjectMutator: (values, type, ...tailingArgs) => {
    const [queryArgs, queryKeys] = tailingArgs.slice(-2)

    return new Proxy(values, {
      get: (target, property) => {
        const actualValue = Reflect.get(target, property)

        if (type === 'logged') {
          return valuePrinted(actualValue)
        }

        return new ValueWrapper({
          value: actualValue,
          printed: () => {
            const existingIndex = queryKeys.indexOf(property)

            if (existingIndex > -1) {
              return valuePlaceholders(queryArgs[existingIndex], existingIndex + 1)
            }

            queryKeys.push(property)
            queryArgs.push(actualValue)
            return valuePlaceholders(actualValue, getQueryKeysTotalLength(queryKeys))
          }
        })
      }
    })
  }
})

// returns var index references for postgres queries
// but prints redacted message to console
dotTemplate.addHandler({
  expressionPrefix: '!PG',
  valuesObjectMutator: (values, type, ...tailingArgs) => {
    const [queryArgs, queryKeys] = tailingArgs.slice(-2)

    return new Proxy(values, {
      get: (target, property) => {
        const actualValue = Reflect.get(target, property)

        if (type === 'logged') {
          return valuePrinted(actualValue, true)
        }

        return new ValueWrapper({
          value: actualValue,
          printed: () => {
            const existingIndex = queryKeys.indexOf(property)

            if (existingIndex > -1) {
              return valuePlaceholders(queryArgs[existingIndex], existingIndex + 1)
            }

            queryKeys.push(property)
            queryArgs.push(actualValue)
            return valuePlaceholders(actualValue, getQueryKeysTotalLength(queryKeys))
          }
        })
      }
    })
  }
})

module.exports.handleQuery = () => {
  throw new Error('.handleQuery() has not been set up')
}

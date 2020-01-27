const pgDotTemplate = require('@conjurelabs/pg-dot-template')
const { Client } = require('pg')

// see https://node-postgres.com/features/connecting
// requires environment variables
const client = new Client()
client.connect()

// needed to support .query
pgDotTemplate.handleQuery = (queryString, queryArgs) => {
  return client.query(queryString, queryArgs)
}

async function main() {
  // pulls in template
  const template = pgDotTemplate('select-accounts')

  // replace expressions
  const queryString = await template({
    emailMatch: '%@gmail.com',
    idStart: 4
  })

  console.log('query:')
  console.log(queryString)

  const result = await queryString.query()
  client.end()

  console.log('rows:')
  console.log(result.rows)
}
main()

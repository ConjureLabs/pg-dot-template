const pgDotTemplate = require('@conjurelabs/pg-dot-template')
const { Client } = require('pg')

// see https://node-postgres.com/features/connecting
// requires environment variables
const client = new Client()
client.connect()

async function main() {
  // pulls in template
  const template = pgDotTemplate('select-accounts')

  // replace expressions
  const query = await template({
    emailMatch: '%@gmail.com',
    idStart: 4
  })

  console.log('query:')
  console.log(query)

  console.log('query args:')
  console.log(query.queryArgs)

  const result = await client.query(query, query.queryArgs)
  client.end()

  console.log('rows:')
  console.log(result.rows)
}
main()

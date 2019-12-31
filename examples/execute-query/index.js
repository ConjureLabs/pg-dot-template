const pgDotTemplate = require('@conjurelabs/pg-dot-template')
const { Client } = require('pg')

// required setup - appends handlers to dot-template
pgDotTemplate.setup()

// see https://node-postgres.com/features/connecting
// requires environment variables
const client = new Client()
client.connect()

async function main() {
  // pulls in template
  const template = pgDotTemplate('select-accounts')

  const queryArgs = ['%@gmail.com', 4]

  // replace expressions
  const query = await template({
    emailMatch: '%@gmail.com',
    idStart: 4
  }, queryArgs)

  console.log('query:')
  console.log(query)

  const result = await client.query(query, queryArgs)
  client.end()

  console.log('rows:')
  console.log(result.rows)
}
main()

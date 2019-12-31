const pgDotTemplate = require('@conjurelabs/pg-dot-template')
const { Client } = require('pg')

// see https://node-postgres.com/features/connecting
// requires environment variables
const client = new Client()
client.connect()

// required setup - appends handlers to dot-template
// this example passes a connected `client`
// you can also pass a connected `pool`
pgDotTemplate.setup(client)

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

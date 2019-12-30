const { Client } = require('pg')
const pgDotTemplate = require('@conjurelabs/pg-dot-template')

pgDotTemplate.setup()

const client = new Client()
client.connect()

async function main() {
  const template = pgDotTemplate('select-accounts')

  const query = await template({
    emailMatch: '%@gmail.com',
    idStart: 4
  }, ['%@gmail.com', 4])

  console.log('console.log result:')
  console.log(query)

  console.log('literal value:')
  console.log(query.toString())
}
main()

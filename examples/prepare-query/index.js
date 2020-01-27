const pgDotTemplate = require('@conjurelabs/pg-dot-template')

async function main() {
  // pulls in template
  const template = pgDotTemplate('select-accounts')

  // replace expressions
  const query = await template({
    emailMatch: '%@gmail.com',
    idStart: 4
  })

  console.log('console.log result:')
  console.log(query)

  console.log('literal value:')
  console.log(query.toString())
}
main()

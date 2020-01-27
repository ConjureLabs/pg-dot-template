const pgDotTemplate = require('@conjurelabs/pg-dot-template')

async function main() {
  // pulls in template
  const template = pgDotTemplate('select-user-id-by-emails')

  // replace expressions
  const query = await template({
    emails: ['abc@abc.abc', 'jkl@jkl.jkl', 'xyz@xyz.xyz']
  })

  console.log('console.log result:')
  console.log(query)

  console.log('literal value:')
  console.log(query.toString())

  console.log('query args:')
  console.log(query.queryArgs)
}
main()

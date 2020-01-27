# pg-dot-template

extends [`dot-template`](https://github.com/ConjureLabs/dot-template#readme), with added niceties specific to [the pg module](https://node-postgres.com/)

## install

```sh
# peer dependencies
npm install @conjurelabs/dot-template

# required if using .query methods
npm install pg

# library
npm install @conjurelabs/pg-dot-template
```

## use

`pg-dot-template` uses [`dot-tempalte`](https://github.com/ConjureLabs/dot-template) to add extra utilities for dealing with postgres queries

_activity-query.sql_
```sql
select *
from activity
where added $PG{added}
limit $PG{limit}
```

```js
const pgDotTemplate = require('@conjurelabs/pg-dot-template')

const client = new Client()
client.connect()

// required setup if using .query
pgDotTemplate.onQuery = (queryString, queryArgs) => {
  return client.query(queryString, queryArgs)
}

async function main() {
  // pulls in template
  const template = pgDotTemplate('activity-query')

  // replace expressions
  const queryString = await template({
    added: '>= NOW() - interval 1 day',
    limit: 10
  })

  // prints:
  /*
    select *
    from activity
    where added >= NOW() - interval 1 day
    limit 10
   */
  console.log(queryString)

  // queries:
  /*
    select *
    from activity
    where added >= $1
    limit $2
   */
  // with query args:
  /*
    ['>= NOW() - interval 1 day', 10]
   */
  const result = await queryString.query()

  console.log(result.rows)
}
main()
```

### postgres expression handlers

this library adds two unique handlers

#### $PG{expression}

`$PG{expression}` prints the value of `expression` to console, while passing an index reference (like `$1`) in the literal query

as expressions are evaluated, the library will construct an array of query arguments that are passed to the postgres client

```sql
select *
from authors
where name ilike '$PG{namePrefix}'
```

```js
const template = pgDotTemplate('authors')

const queryString = template({
  namePrefix: 'clint '
})

console.log(queryString)

// prints:
/*
  select *
  from authors
  where name ilike 'clint '
 */
```

#### !PG{expression}

`!PG{expression}` prints a `<REDACTED>` message to console, while passing an index reference (like `$1`) in the literal query

this is to be used with PII, like names and email addresses

```sql
select *
from authors
where email = '!PG{email}'
```

```js
const template = pgDotTemplate('authors')

const queryString = template({
  email: 'example@gmail.com'
})

console.log(queryString)

// prints:
/*
  select *
  from authors
  where email = '<REDACTED>'
 */
```

### .query()

there are two ways you can call `.query()`

```js
const template = pgDotTemplate('activity-query')

// calling .query() via a template
const result1 = await template.query({
  added: '>= NOW() - interval 1 day',
  limit: 10
})

// calling .query() via a filled-in template
const queryString = template({
  added: '>= NOW() - interval 1 day',
  limit: 10
})
const result2 = await queryString.query()
````

also, if you need it, you will have access to the passed `queryArgs`

this will be an empty `[]` array until `.query()` is called

this attribute is only available when executing `.query()` on a filled-in query string

```js
const template = pgDotTemplate('activity-query')

const queryString = template({
  added: '>= NOW() - interval 1 day',
  limit: 10
})

const result = await queryString.query()

// prints:
/*
  ['>= NOW() - interval 1 day', 10]
 */
console.log(result.queryArgs)
```

### types

this library supports:

- strings
- numbers
- bigints
- booleans
- `null`
- arrays of the above

it does not support `undefined` or nested arrays

any unexpected values will trigger an error to be thrown

arrays will not be auto-wrapped in `()`s

### using pg's Pool

if you plan to use [`Pool`](https://node-postgres.com/features/pooling) to connect, you will want to call `.connect()` before each query, and then `release()` when finished:

```js
const pool = new Pool()

pgDotTemplate.onQuery = async (queryString, queryArgs) => {
  const connection = await pool.connect()

  return new Promise(async (resolve, reject) => {
    let result, err
    
    try {
      result = await connection.query(queryString, queryArgs)
    } catch(tryErr) {
      err = tryErr
    } finally {
      connection.release()
    }

    if (err) {
      return reject(err)
    }
    resolve(result)
  })
}
```

### changing the redacted message

by default any redaction will show in terminal as `<REDACTED>`

you can change this string by setting the enironment variable `PG_DOT_TEMPLATE_REDACTION_MESSAGE`

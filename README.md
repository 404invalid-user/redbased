# redbased
use your redis server in a database way with defined schemas

if you are looking to use redis as your only database you must enable persistence https://redis.io/docs/management/persistence/ 


## Starter Example

```js
const RedBased = require('redbased');

const User = new RedBased.Schema('User',{
  name: {
    required: true,
    type: String,
    defaultValue: "jon demo"
  },
  age: {
    required: true,
    type: Number,
    defaultValue: 0
  }
});

async function main() {
  //format <password> : <host> : <port> || <host> : <port>
  const redbasedConnectURI = 'p@55w0rd:127.0.0.1:6379';

  await RedBased.connect(redbasedConnectURI);

  await User.create({
    id: '1',
    name: "bob"
  });

  const bob = await User.findById('1');
  console.log(bob);

  bob.age = 33;
  bob.save();
  console.log(bob);
}
main();
```

## Docs

#### `.connect(<connect string: String>)`

connects to the redis server 

string format: `<password> : <host> : <port>` or `<host> : <port>`

returns: Boolean || Redis Error

<br>



#### `.Schema(<schema name: String>, <Schema Definition: Object>)`

setup and define your schema instance by providing a schema name and object containing keys defined by the schema definition

##### schema-definition

a schema will contain an object of keys each key must be this specific schema definition:
```obj
{
  required: true,
  type: String,
  defaultValue: "jon demo"
}
```

if we break this down
**required** is whether or not that particular key is required in your schema object when saving, true means it is required and false means it is not so it can be null or undefined or just not exist.

**type** is the data type that must be saved under that key currenly we only support the following types: String, Number, Boolean, and Object.

**defaultValue** is the value that will be saved under that key by default if one is not provided on creation. 

returns: SchemaInstance


### `<SchemaInstance>.create(<document: object>)`

creates a new document following the defined schema

returns: DocumentInstance



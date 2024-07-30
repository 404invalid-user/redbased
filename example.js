const {RedBased, Schema} = require('redbased');



const db = new RedBased({db:1,host:"100.69.0.24"});

const UserSchema = new Schema({
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

  await db.connect();
//no redis instance error if not connected
db.setupSchema("User", UserSchema);

  const newUser = await db.schemas['User'].create({
    id: '1',
    name: "bob"
  });
  console.log(newUser)

  const bob = await User.findById('1');
  console.log(bob);

  bob.age = 33;
  bob.save();
  console.log(bob);
}
main();
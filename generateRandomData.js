const axios = require("axios").default;
const RedBased = require('./dist/index');



async function main() {
  console.log("connecting to redis");
  await RedBased.connect("UNSfRB4MdQigv9kfwkRyEhx:127.0.0.1:6379");
  console.log("connected to redis");
  const user = new RedBased.Schema('User', {
    id: {
      required: true,
      type: String
    },
    name: {
      required: true,
      type: String
    },
    gender: {
      required: true,
      type: String,
      defaultValue: "none"
    },
    age: {
      required: true,
      type: Number,
      defaultValue: 0
    }
  });
  axios.get('https://randomuser.me/api/?results=50', {
  })
    .then(function (response) {
      const people = response.data.results;

      for(const person of people) {
        user.create({id: person.login.uuid,
        name: `${person.name.first} ${person.name.last}`,
        gender: person.gender,
        age: person.dob.age});
        console.log("added new user: " +person.login.uuid);
      }
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    })
}

main()
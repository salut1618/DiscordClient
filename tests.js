const {Client, User} = require("./index")
const config = require("./config.json")
async function main(){
    let e = new Client(config.token)
    await e.start()
    e._channels['920746094235902042'].send("test")
}
main()
// TODO 
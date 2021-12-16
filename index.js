var WebSocket = require('ws');
const EventEmitter = require("events")
var fs = require('fs')
const config = require('./templates.json');
const fetch = require("node-fetch");

const api = "https://discord.com/api/v9"
const { User, DMChannel, GuildChannel, Message, apiUri } = require("./utils.js")
// const MESSAGE_CREATE = require('./discord.js/src/client/websocket/handlers/MESSAGE_CREATE');


class Client extends EventEmitter {
    ws;
    /**
     * 
     * @param {string} token Token of client
     * @param {number} custom_id a custom id that would help in managing multiple clients instead of one
     */
    constructor(token, custom_id = 0) {
        super()
        this.ind = custom_id || 0
        this.token = token
        this.interval = 0;
        this.seq = null;
        this.session_id = null
        this.me = {}

        if (!fs.existsSync('log')) fs.mkdirSync("log");
        this._log_name = `./log/log-${this.ind}-${Date.now()}.json`


        /** {user_id: User}
         *  @type {Object.<string, User>}
         */
        this._users = {}
        /** {channel_id: Channel}
         *  @type {Object.<string, (DMChannel | GuildChannel)>}
         */
        this._channels = {}

        this._headers = config.headers
        this._headers.authorization = token
        fetch(apiUri.GETSETTINGS(), { headers: this._headers }).then(response => {
            let cookie = response.headers.get('set-cookie').match(/(__dcfduid=[a-zA-Z0-9]+;|__sdcfduid=[a-z0-9]+)/g).join(" ")
            this._headers.cookie = cookie;
            if (response.code == 20001) this.bot = true


            if (!this.bot) {
                this._presense = {
                    status: response.status,
                    scince: 0,
                    afk: false,
                    activities: response.custom_status && response.custom_status.text ? [
                        {
                            "name": "Custom Status",
                            "type": 4,
                            "state": response.custom_status.text,
                            "emoji": response.custom_status.emoji_name ? { id: response.custom_status.emoji_id, name: response.custom_status.emoji_name } : null
                        }
                    ] : []
                }
            }
            this._ready = true
            this.emit("ready", 1)
        })
    }
    /**
     * Starts the client
     */
    async start() {
        await new Promise((resolve, reject)=>{
            if (this._ready) resolve(1)
            this.on('ready', ()=>{this.removeAllListeners('ready');resolve(1)})
        })
        this.ws = new WebSocket('wss://gateway.discord.gg/?v=9&encording=json');
        let payload = config.identify
        payload.d.presence = this._presense
        payload.d.token = this.token

        const beat = () => {
            let d = JSON.stringify({ op: 1, d: this.seq })
            this.ws.send(d)
        }
        const heartbeat = (ms) => {
            return setInterval(() => {
                beat()
            }, ms)
        }
        return new Promise((resolve, reject) => {
            this.ws.on('message', (data) => {
                let payload = JSON.parse(data);
                const { t, op, d, s } = payload;
                this.seq = null || s
                switch (op) {
                    case 10:
                        const { heartbeat_interval } = d;
                        beat()
                        this.interval = heartbeat(heartbeat_interval)
                        break;
                    case 0:
                        console.log(t);
                        fs.appendFileSync(this._log_name, JSON.stringify(payload, null, 4) + "\n");
                        break;
                }

                switch (t) {
                    case "READY":
                        this.session_id = d.session_id;
                        this.me = d
                        for (const user of this.me.users) {

                            this._users[user.id] = new User(user, this)
                        }
                        for (const channel of this.me.private_channels) {
                            this._channels[channel.id] = new DMChannel(channel, this)
                        }
                        resolve(1)
                        // addGuildSubscription1()
                        // ws.send(JSON.stringify(RGM))
                        break;
                    case "SESSIONS_REPLACE":
                        // console.log(this.me.users);
                        
                        break;

                    case "MESSAGE_CREATE":
                        // (message, user_index) => {}
                        /**
                         * Message created
                         * @type {object}
                         * @property {boolean} isPacked - Indicates whether the snowball is tightly packed.
                         */
                        this.emit("message", d, this.ind)
                        break;
                    case "MESSAGE_UPDATE":
                        // (message, user_index) => {}
                        this.emit("message_edit", d, this.ind)
                        break;
                    case "MESSAGE_DELETE":
                        // (message, user_index) => {}
                        this.emit("message_delete", d, this.ind)
                        break;
                    case "MESSAGE_DELETE_BULK":
                        // ({ids: [], guild_id: [], channel_id: []}, user_ind) => {}
                        this.emit("message_bulkdelete", d, this.ind)
                        break;
                    case "CHANNEL_PINS_UPDATE":
                        // (data, user_ind) => {}
                        this.emit("channel_pins_update", d, this.ind)
                        break;

                    case "MESSAGE_REACTION_ADD":
                        // (reaction_data, user_index) =>{}
                        this.emit("message_reactionadd", d, this.ind)
                        break;
                    case "MESSAGE_REACTION_REMOVE":
                        // (reaction_data, user_index) =>{}
                        this.emit("message_reaction_remove", d, this.ind)
                        break;
                    case "MESSAGE_REACTION_REMOVE_ALL":
                        // (reaction_data, user_index) =>{}
                        this.emit("message_reaction_remove_all", d, this.ind)
                        break;
                    case "MESSAGE_REACTION_REMOVE_EMOJI":
                        // (reaction_data, user_index) =>{}
                        this.emit("message_reaction_remove_emoji", d, this.ind)
                        break;

                    case "GUILD_BAN_ADD":
                        // (guild_id, user_id, user_index) => {}
                        this.emit("guild_ban_add", d.guild_id, d.user.id, this.ind)
                        break;
                    case "GUILD_BAN_REMOVE":
                        // (guild_id, user_id, user_index) => {}
                        this.emit("guild_ban_remove", d.guild_id, d.user.id, this.ind)
                        break;

                    case "GUILD_MEMBER_ADD":
                        // (guild_id, member, user_index) => {}
                        this.emit("guild_member_add", d.guild_id, d, this.ind)
                        break;
                    case "GUILD_MEMBER_REMOVE":
                        // (guild_id, user_id, user_index) => {}
                        this.emit("guild_member_remove", d.guild_id, d.user.id, this.ind)
                        break;
                    case "GUILD_MEMBER_UPDATE":
                        // (guild_id, member, user_index) => {}
                        this.emit("guild_member_update", d.guild_id, d, this.ind)
                        break;

                    case "GUILD_ROLE_CREATE":
                        // (guild_id, role, user_ind) => {}
                        this.emit("guild_role_add", d.guild_id, d.role, this.ind)
                        break;
                    case "GUILD_ROLE_UPDATE":
                        // (guild_id, role, user_ind) => {}
                        this.emit("guild_role_update", d.guild_id, d.role, this.ind)
                        break;
                    case "GUILD_ROLE_DELETE":
                        // (guild_id, role_id, user_ind) =>{}
                        this.emit("guild_role_delete", d.guild_id, d.role_id, this.ind);
                        break;

                    case "CHANNEL_CREATE":
                        // (channel, user_ind) => {}
                        this.emit("channel_add", d, this.ind)
                        break;
                    case "CHANNEL_UPDATE":
                        // (channel, user_ind) => {}
                        this.emit("channel_update", d, this.ind)
                        break;
                    case "CHANNEL_DELETE":
                        // (channel, user_ind) => {}
                        this.emit("channel_delete", d, this.ind)
                        break;

                    // TODO GUILDS CREATE
                }
            })
            this.ws.on('open', () => {
                this.ws.send(JSON.stringify(payload));
            })
            this.ws.on("error", er => {
                reject()
            })
        })
        
    }
    stop() {
        this.ws.close()
    }
    async waitForWebsocketEvent(event, filter) {
        let ws = this.ws
        return new Promise((resolve, reject) => {
            function waitforchunk(data) {
                let _data = JSON.parse(data)
                const { t, d } = _data
                if (t == event) {
                    if (filter && filter(d) || !filter) {
                        ws.removeEventListener('message', waitforchunk)
                        resolve(d)
                    }
                }
            }
            ws.on('message', waitforchunk)
            ws.on('error', (er) => { reject() })
        })
    }
    /**
     * Requests guild members
     * @param {string} guild_id 
     * @param {string[]} user_ids 
     * @example
     * await client.getGuildMembers("123456789", ["1234444", "121212"])
     */
    async getGuildMembers(guild_id, user_ids) {
        let payload = config.requestGuildMembers
        payload.d.guild_id.push(guild_id)
        payload.d.user_ids = payload.d.user_ids.concat(user_ids)
        this.ws.send(JSON.stringify(payload))
        return await this.waitForWebsocketEvent("GUILD_MEMBERS_CHUNK")
    }
    /**
     * update guild-channel-member subscription, usefull for knowing member updates
     * @param {string} guild_id 
     * @param {string[]} member_ids 
     * @param {boolean} extra 
     * @example
     * client.updateGuildSubscriptions(guild_id, [membebr_id1, member_id2]})
     */
    updateGuildMembersSubscriptions(guild_id, member_ids, extra = false) {
        let payload = extra ? config.updateGuildSubscriptions1 : config.updateGuildSubscriptions2
        payload.d.guild_id = guild_id
        payload.d.members = member_ids
        console.log(payload);
        this.ws.send(JSON.stringify(payload))
        // await this.waitForWebsocketEvent("GUILD_MEMBER_LIST_UPDATE")
    }
}
module.exports = { Client, User }

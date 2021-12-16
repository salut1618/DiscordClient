const fetch = require("node-fetch");
const {Client} = require('./index')
const {getKeyByValue} = require("./tools")

const api = "https://discord.com/api/v9"

/**
 * @typedef {("GUILD_TEXT_CHANNEL" | "DM" | "GUILD_VOICE" | "GROUP_DM" | "GUILD_CATEGORY" | "GUILD_NEWS" | "GUILD_STORE" | "GUILD_NEWS_THREAD" | "GUILD_PUBLIC_THREAD" | "GUILD_PRIVATE_THREAD" | "GUILD_STAGE_VOICE")} channelTypes
 */

const channelTypes = {
    GUILD_TEXT_CHANNEL: 0,
    DM: 1,
    GUILD_VOICE: 2,
    GROUP_DM: 3,
    GUILD_CATEGORY: 4,
    GUILD_NEWS: 5,
    GUILD_STORE: 6,
    GUILD_NEWS_THREAD: 10,
    GUILD_PUBLIC_THREAD: 11,
    GUILD_PRIVATE_THREAD: 12,
    GUILD_STAGE_VOICE: 13
}
const apiUri = {
    CREATEMESSAGE: (id) => `${api}/channels/${id}/messages`,
    GETSETTINGS: () => `https://discord.com/api/v9/users/@me/settings`,

}

class Guild{
    /**
     * Class representation of a guild
     * @param {Object} data 
     */
    constructor(data){
        this.name = data.name;
        this.id = data.id
        this.description = data.description;
        this.vanity_url_code = data.vanity_url_code
        this.boosts = data.premium_subscription_count
        // TODO OWNER
        // TODO EMOJIS
        // TODO ROLES
        // TODO STICKERS
        // TODO TIME JOINED
        // TODO ICON URL
        /**
         * raw guild data in JSON-string
         */
        this.raw = JSON.stringify(data)
    }
}
class GuildManager{
    /**
     * The client.guilds thing
     * @param {Object[]} guilds 
     */
    constructor(guilds){

    }
}


class BaseChannel{
    constructor(data, client){
        /**
         * @type {channelTypes}
         */
        this.type = getKeyByValue(channelTypes, data.type)
        this.typeCode = data.type
        this.id = data.id
        this.name = data.name
        this.client = client
    }
    send(content){
        let payload = {}
        payload.content = content
        payload = JSON.stringify(payload)
        fetch(apiUri.CREATEMESSAGE(this.id), {headers: this.client._headers, "body": payload, method: "POST"})
    }
}
class DMChannel extends BaseChannel{
    /**
     * 
     * @param {Object} data 
     * @param {Client} client 
     */
    constructor(data, client){
        super(data, client)
        if(this.typeCode == channelTypes.DM){
            this.user = client._users[data.recipient_ids[0]] || new User(data.recipient_ids[0], client)
        }else{
            this.user = client._users[data.owner_id] || new User({id: data.owner_id}, client)
        }
        /**
         * Users inside dm channels
         * @type {}
         */
        this.users = data.recipient_ids.map(id=>client._users[id] || new User(id, client))
        this.lastMessageId = data.last_message_id
    }
}
class GuildChannel extends BaseChannel{
    constructor(data, client){
        // super(data, client)
        // delete this.user_id

    }
}


class User{
    /**
     * 
     * @param {Object} data 
     * @param {Client} client 
     */
    constructor(data, client){
        this.fetched = data.username != undefined
        /**
         * XxSavourxX
         * @type {string}
         */
        this.username = data?.username
        /**
         * 0069
         * @type {string}
         */
        this.discriminator = data?.discriminator
        /**
         * XxSavourxX#0069
         * @type {string}
         */
        this.tag = this.username ? (this.username + "#" + this.discriminator) : undefined
        this.id = data.id
        this.userFlags = data?.public_flags
        this.avatar = data?.avatar
        this.avatar_url = this.avatar ? `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}` : "https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png" 
        /**
         * raw user data in JSON-string
         */
        this.raw = JSON.stringify(data)
        this.client = client
        // this.client.stop()
    }
    getDmChannel(){
        let id = Object.keys(this.client._channels).find(key=>this.client._channels[key].typeCode == channelTypes.DM && this.client._channels[key].user.id == this.id)
        return this.client._channels[id]
        // TODO CREATE CHANNEL IF NOT
    }
}

class Message{

}
module.exports = {User, DMChannel, GuildChannel, Message, apiUri}
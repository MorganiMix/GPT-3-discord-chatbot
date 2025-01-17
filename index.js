const { Client, Events, GatewayIntentBits } = require("discord.js")
require("dotenv/config")
const { OpenAIApi, Configuration } = require("openai")

const config = new Configuration({
    apiKey: process.env.OPENAI_KEY
})

const openai = new OpenAIApi(config)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
})

client.once(Events.ClientReady, (clientUser) => {
    console.log(`Logged in as ${clientUser.user.tag}`)
})

client.login(process.env.BOT_TOKEN)

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return

    console.log(message.content)
    message.channel.sendTyping()

    if (!process.env.BOT_CHANNEL_ANY && message.channel.id !== process.env.BOT_CHANNEL) return

    let messages = Array.from(await message.channel.messages.fetch({
        limit: process.env.PAST_MESSAGES,
        before: message.id
    }))
    messages = messages.map(m=>m[1])
    messages.unshift(message)

    let users = [...new Set([...messages.filter(m => m.member && m.member.displayName).map(m => m.member.displayName), client.user.username])]

    let lastUser = users.pop()

    let prompt = `The following is a conversation between ${users.join(", ")}, and ${lastUser}. \n\n`

    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]
        if (m.member && m.member.displayName) prompt += `${m.member.displayName}: ${m.content}\n`
    }

    prompt += `${client.user.username}:`
    console.log("prompt:", prompt)

    const BOT_ID = process.env.BOT_ID
    let flag = message.content.includes(BOT_ID)
    console.log("bot_id.flag",BOT_ID,flag)
    if (!flag) return

    const response = await openai.createCompletion({
        prompt,
        model: process.env.OPENAI_MODEL,
        max_tokens: Number(process.env.MAX_TOKENS),
        stop: ["\n"]
    })

    console.log("response", response.data.choices[0].text)
    await message.channel.send(response.data.choices[0].text)
})

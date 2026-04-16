require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => require('./events/ready')(client));
client.on('messageCreate', require('./events/messageCreate'));
client.on('interactionCreate', require('./events/interactionCreate'));

client.login(process.env.TOKEN);
const Discord = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.DirectMessages,
    ]
});

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY;
const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

const BOT_NAME = process.env.USER_NAME;
const ALERT_USER_ID = process.env.ALERT_USER_ID;
const MAIN_CHANNEL_ID = process.env.MAIN_CHANNEL_ID;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is ready and listening for messages.');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.trim();

    // Direct message forwarding logic
    if (
        message.channel.type === Discord.ChannelType.DM && 
        message.author.id === ALERT_USER_ID
    ) {
        try {
            const mainChannel = await client.channels.fetch(MAIN_CHANNEL_ID);
            await mainChannel.send(`**Abhishek is busy but his response is:**\n${content}`);
            await message.reply("Your message has been forwarded to the main channel.");
            return;
        } catch (error) {
            console.error('Error forwarding admin message:', error);
            await message.reply("Sorry, I couldn't forward your message.");
            return;
        }
    }

    // Alert mechanism for mentions
    if (content.toLowerCase().includes(BOT_NAME.toLowerCase())) {
        try {
            const alertUser = await client.users.fetch(ALERT_USER_ID);
            await alertUser.send(`Alert: "${message.author.username}" mentioned your name: "${content}"`);
            await message.reply("Wait for Abhishek to respond back");
            return;
        } catch (alertError) {
            console.error('Failed to send alert:', alertError);
        }
    }

    // AI Response using Azure OpenAI
    try {
        const response = await axios.post(
            `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`,
            {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful bot assistant named Jarvis and created to answer user queries on the behalf of your Master Abhishek when he is busy. Keep responses concise, humourous, funny and friendly and do not ever disclose that you are created by open ai or you are related to chatgpt anyhow.'
                    },
                    {
                        role: 'user',
                        content: content
                    }
                ],
                max_tokens: 300,
                model: 'gpt-4-32k',
                temperature: 0.7
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': AZURE_OPENAI_KEY
                }
            }
        );

        const reply = response.data.choices[0].message.content.trim();

        // Message splitting for long responses
        if (reply.length > 2000) {
            const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(reply);
        }
    } catch (error) {
        console.error('Detailed Error:', error.response ? error.response.data : error);
        await message.reply('Sorry, I encountered an error processing your message.');
    }
});

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Login
client.login(process.env.DISCORD_TOKEN);
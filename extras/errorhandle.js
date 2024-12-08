const Discord = require('discord.js');
const OpenAI = require('openai');
require('dotenv').config();

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.DirectMessages,
    ]
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const BOT_NAME = process.env.USER_NAME;
const ALERT_USER_ID = process.env.ALERT_USER_ID;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is ready and listening for messages.');
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages and empty messages
    if (message.author.bot || !message.content) return;

    const content = message.content.trim();

    // Basic greeting handling
    if (['hi', 'hello', 'hey'].includes(content.toLowerCase())) {
        try {
            await message.reply(`Hello! I'm ${BOT_NAME}. How can I help you today?`);
            return;
        } catch (error) {
            console.error('Error sending greeting:', error);
            return;
        }
    }

    // AI Response
    try {
        console.log('Received message:', content); // Debug logging

        // Validate OpenAI API key
        if (!process.env.OPENAI_API_KEY) {
            console.error('OpenAI API key is missing!');
            await message.reply('Sorry, my AI capabilities are currently unavailable.');
            return;
        }

        const aiResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { 
                    role: 'system', 
                    content: 'You are a helpful Discord bot assistant. Keep responses concise and friendly.' 
                },
                { 
                    role: 'user', 
                    content: content 
                }
            ],
            max_tokens: 300,
        });

        // More detailed logging
        console.log('OpenAI Response:', aiResponse);

        const reply = aiResponse.choices[0].message.content.trim();
        
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
        // Comprehensive error logging
        console.error('Detailed Error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            response: error.response ? error.response.data : 'No response data'
        });

        // More informative error message
        if (error.response) {
            console.error('OpenAI API Error:', error.response.data);
            await message.reply(`Sorry, I'm experiencing some technical difficulties. Error: ${error.response.data.error.message || 'Unknown error'}`);
        } else if (error.message.includes('API key')) {
            await message.reply('Sorry, there seems to be an issue with my AI configuration.');
        } else {
            await message.reply('Sorry, I encountered an unexpected error while processing your message.');
        }
    }
});

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Login
client.login(process.env.DISCORD_TOKEN);
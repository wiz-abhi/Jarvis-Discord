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
const MAIN_CHANNEL_ID = process.env.MAIN_CHANNEL_ID; // Add this to your .env file

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is ready and listening for messages.');
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages and empty messages
    if (message.author.bot) return;

    const content = message.content.trim();

    // Check if message is a direct message to the bot from the alert user
    if (
        message.channel.type === Discord.ChannelType.DM && 
        message.author.id === ALERT_USER_ID
    ) {
        try {
            // Fetch the main channel
            const mainChannel = await client.channels.fetch(MAIN_CHANNEL_ID);
            
            // Send the message to the main channel with a custom prefix
            await mainChannel.send(`**Abhishek is busy but his response is:**\n${content}`);
            
            // Optional: Send a confirmation back to the admin
            await message.reply("Your message has been forwarded to the main channel.");
            
            return;
        } catch (error) {
            console.error('Error forwarding admin message:', error);
            await message.reply("Sorry, I couldn't forward your message.");
            return;
        }
    }

    // Existing bot logic for other messages
    // Alert mechanism for mentions
    if (content.toLowerCase().includes(BOT_NAME.toLowerCase())) {
        try {
            const alertUser = await client.users.fetch(ALERT_USER_ID);
            await alertUser.send(`Alert: "${message.author.username}" mentioned your name: "${content}"`);
            console.log('Alert sent successfully');
        } catch (alertError) {
            console.error('Failed to send alert:', alertError);
        }
    }

    // AI Response (rest of the existing code remains the same)
    try {
        const aiResponse = await openai.chat.completions.create({
            model: 'gpt-4-32k',
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
        // More specific error logging and handling
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('OpenAI API Error:', error.response.status);
            console.error('Error Details:', error.response.data);

            // Only send an error message for specific types of errors
            if (error.response.status === 401) {
                // Unauthorized - likely an API key issue
                console.error('Invalid API Key. Please check your OpenAI credentials.');
            } else if (error.response.status === 429) {
                // Rate limit exceeded
                console.error('OpenAI API rate limit exceeded. Please try again later.');
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from OpenAI API');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up OpenAI API request:', error.message);
        }

        // Optionally, you can choose to only send an error message in specific cases
        // For example, only for API key or network-related errors
        if (error.response && (error.response.status === 401 || error.response.status === 429)) {
            await message.reply('Sorry, there was an issue processing your message. Please try again later.');
        }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
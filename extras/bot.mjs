import Discord from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Discord client with updated intents
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.DirectMessages,
    ]
});

// Initialize OpenAI with new constructor
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Configuration variables
const BOT_NAME = process.env.USER_NAME;
const ALERT_USER_ID = process.env.ALERT_USER_ID;

// Bot ready event
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Message handling
client.on('messageCreate', async (message) => {
    // Ignore messages from other bots
    if (message.author.bot) return;

    const content = message.content.trim();

    // Check for direct mention of bot name
    if (content.toLowerCase().startsWith(BOT_NAME.toLowerCase())) {
        const query = content.slice(BOT_NAME.length).trim();

        try {
            // Send alert to specified user
            const alertUser = await client.users.fetch(ALERT_USER_ID);
            await alertUser.send(`Alert: "${message.author.username}" mentioned your name in a query: "${query}"`);
        } catch (alertError) {
            console.error('Failed to send alert:', alertError);
        }
    }

    // Process OpenAI query
    try {
        // Only process if message is not just a bot name mention
        if (!content.toLowerCase().startsWith(BOT_NAME.toLowerCase())) {
            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4-32k', // Updated model name
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
                max_tokens: 300, // Limit response length
            });

            const reply = aiResponse.choices[0].message.content.trim();
            
            // Send reply, splitting long messages if necessary
            if (reply.length > 2000) {
                const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
                for (const chunk of chunks) {
                    await message.reply(chunk);
                }
            } else {
                await message.reply(reply);
            }
        }
    } catch (error) {
        console.error('OpenAI API Error:', error);
        
        // Provide a helpful error message
        if (error.response) {
            message.reply(`Sorry, I encountered an API error: ${error.response.data.error.message}`);
        } else {
            message.reply('Sorry, there was an error processing your query.');
        }
    }
});

// Error handling for client
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
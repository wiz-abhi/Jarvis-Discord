const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // Check if the message starts with "!clear" and is sent by an admin
    if (message.content.startsWith('!clear')) {
        // Check if the user has the required permission
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply("You don't have permission to use this command.");
        }

        // Parse the number of messages to delete
        const args = message.content.split(' ');
        const deleteCount = parseInt(args[1], 10);

        if (!deleteCount || deleteCount < 1 || deleteCount > 100) {
            return message.reply('Please provide a number between 1 and 100 for the number of messages to delete.');
        }

        // Bulk delete messages
        try {
            const deletedMessages = await message.channel.bulkDelete(deleteCount, true);
            message.channel.send(`🧹 Cleared ${deletedMessages.size} messages!`).then((msg) => {
                setTimeout(() => msg.delete(), 5000); // Auto-delete the confirmation message
            });
        } catch (error) {
            console.error(error);
            message.channel.send('There was an error trying to delete messages in this channel.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

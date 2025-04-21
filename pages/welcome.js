const fs = require('fs');
const path = require('path');

module.exports = {
    name: "welcome",
    async execute(sock, msg, participants, groupId) {
        const pluginConfigPath = path.join(__dirname, 'json/welcome.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ Welcome config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Welcome config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ Welcome command is disabled.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command is currently disabled." });
        }

        // Ensure there are participants to welcome
        if (!participants || participants.length === 0) {
            console.log('⚠️ No participants to welcome.');
            return;
        }

    
        // Loop through each participant that joins the group
        for (const participant of participants) {
            try {
                const username = `@${participant.split('@')[0]}`; // Format the username
                
                // Ensure welcomeMessages array exists and has messages
                if (!config.welcomeMessages || config.welcomeMessages.length === 0) {
                    console.error("❌ No welcome messages found in the config.");
                    return sock.sendMessage(groupId, { text: "❌ No welcome messages configured." });
                }

                // Randomly choose a welcome message from the config
                const randomMessage = config.welcomeMessages[
                    Math.floor(Math.random() * config.welcomeMessages.length)
                ].replace('@{{user}}', username);
                
                // Debugging: Log the message being sent
                console.log(`Sending message to ${participant}:`, randomMessage);

                // Send the welcome message to the group
                await sock.sendMessage(groupId, { text: randomMessage, mentions: [participant] });
            } catch (error) {
                console.error(`Error sending welcome message to ${participant}: ${error}`);
            }
        }
    }
};

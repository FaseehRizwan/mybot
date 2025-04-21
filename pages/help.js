const fs = require('fs');
const path = require('path');

const cooldowns = {}; // Object to store cooldowns

module.exports = {
    name: "help",
    async execute(sock, msg) {
        const pluginConfigPath = path.join(__dirname, 'json/help.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ Help config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Help config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ Help command is disabled.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command is currently disabled." });
        }

        const userId = msg.key.remoteJid;
        const cooldownTime = config.cooldownTime * 1000; // Convert seconds to milliseconds

        // Check if the user is on cooldown
        if (cooldowns[userId] && Date.now() - cooldowns[userId] < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (Date.now() - cooldowns[userId])) / 1000);
            return sock.sendMessage(userId, { text: `⏳ Please wait ${remainingTime} seconds before using this command again.` });
        }

        // Update the cooldown for the user
        cooldowns[userId] = Date.now();

        // Send the help response text
        try {
            await sock.sendMessage(userId, { text: config.responseText });
        } catch (error) {
            console.error(`Error sending help message: ${error}`);
        }
    }
};
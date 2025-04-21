const fs = require('fs');
const path = require('path');

const cooldowns = {}; // Object to store cooldowns

module.exports = {
    name: "news",
    async execute(sock, msg) {
        const pluginConfigPath = path.join(__dirname, 'json/news.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ News config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ News config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ News command is disabled.");
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

        // Send the latest news
        try {
            const newsText = config.news.join('\n\n');
            await sock.sendMessage(userId, { text: `📰 Latest News:\n\n${newsText}` });
        } catch (error) {
            console.error(`Error sending news message: ${error}`);
        }
    }
};
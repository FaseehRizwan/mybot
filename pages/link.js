const fs = require('fs');
const path = require('path');

const cooldowns = {}; // Object to store cooldowns

module.exports = {
    name: "link",
    async execute(sock, msg) {
        const pluginConfigPath = path.join(__dirname, 'json/link.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ Link config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Link config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ Link command is disabled.");
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

        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const args = messageText.split(" ").slice(1);

        if (args.length === 0) {
            // If no group name is provided, send the list of available groups
            const groupNames = Object.keys(config.groups).join(", ");
            return sock.sendMessage(userId, { text: `📋 Please specify a group name. Available groups: ${groupNames}` });
        }

        const groupName = args.join(" ").toLowerCase();

        // Check if the group exists
        if (!config.groups[groupName]) {
            return sock.sendMessage(userId, { text: `❌ Group "${groupName}" not found. Please check the available groups.` });
        }

        // Send the link for the specified group
        try {
            const groupLink = config.groups[groupName];
            await sock.sendMessage(userId, { text: `🔗 Here is the link for "${groupName}": ${groupLink}` });
        } catch (error) {
            console.error(`Error sending link message: ${error}`);
        }
    }
};
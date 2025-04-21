const fs = require('fs');
const path = require('path');

module.exports = {
    name: "tagall",
    async execute(sock, msg) {
        const pluginConfigPath = path.join(__dirname, 'json/tagall.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ TagAll config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ TagAll config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ TagAll command is disabled.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command is currently disabled." });
        }

        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants.map(participant => participant.id);
        const notificationText = config.notificationText;

        // Create mentions
        const mentions = participants.map(id => `@${id.split('@')[0]}`).join(' ');

        // Send the message with mentions
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `${notificationText}\n\n${mentions}`,
                mentions: participants
            });
            console.log("✅ TagAll message sent to the group.");
        } catch (error) {
            console.error(`❌ Failed to send TagAll message: ${error}`);
        }
    }
};
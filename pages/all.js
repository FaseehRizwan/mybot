const fs = require('fs');
const path = require('path');

module.exports = {
    name: "all",
    async execute(sock, msg) {
        const pluginConfigPath = path.join(__dirname, 'json/all.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ All config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ All config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ All command is disabled.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command is currently disabled." });
        }

        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants.map(participant => participant.id);
        const notificationText = config.notificationText;

        // Create a message without visible mentions
        const mentions = participants.map(participant => participant);
        const messageWithoutMentions = `📢 ${notificationText}`;

        // Send the notification in the group with mentions
        try {
            await sock.sendMessage(msg.key.remoteJid, { text: messageWithoutMentions, mentions });
            console.log("✅ Notification sent to all group members.");
        } catch (error) {
            console.error(`❌ Failed to send notification: ${error}`);
        }
    }
};
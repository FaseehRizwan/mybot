const fs = require('fs');
const path = require('path');

module.exports = {
    name: "kick",
    async execute(sock, msg, args) {
        const pluginConfigPath = path.join(__dirname, 'json/kick.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ Kick config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kick config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ Kick command is disabled.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command is currently disabled." });
        }

        // Check if a user is mentioned
        if (!args || args.length === 0 || !args[0].startsWith('@')) {
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Please mention a user to kick. Example: !kick @user" });
        }

        const userToKick = args[0].replace('@', '') + '@s.whatsapp.net';

        try {
            // Kick the user from the group
            await sock.groupParticipantsUpdate(msg.key.remoteJid, [userToKick], 'remove');
            await sock.sendMessage(msg.key.remoteJid, { text: config.kickMessage });
        } catch (error) {
            console.error(`Error kicking user: ${error}`);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to kick the user." });
        }
    }
};
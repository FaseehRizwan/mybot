const fs = require('fs');
const path = require('path');

module.exports = {
    name: "add",
    async execute(sock, msg, args) {
        const pluginConfigPath = path.join(__dirname, 'json/add.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ Add config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Add config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ Add command is disabled.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command is currently disabled." });
        }

        // Check if a number is provided
        if (!args || args.length === 0 || !/^\d+$/.test(args[0])) {
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Please provide a valid number to add. Example: !add 1234567890" });
        }

        const userToAdd = args[0] + '@s.whatsapp.net';

        try {
            // Add the user to the group
            await sock.groupParticipantsUpdate(msg.key.remoteJid, [userToAdd], 'add');
        } catch (error) {
            console.error(`Error adding user: ${error}`);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to add the user." });
        }
    }
};
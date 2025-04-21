const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // Fix for fetch
const fs = require('fs');
const path = require('path'); // Import the path module

const cooldowns = {}; // Object to store cooldowns

module.exports = {
    name: "define",
    async execute(sock, msg) {
        const pluginConfigPath = path.join(__dirname, 'json/define.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ Define config file missing.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Define config file missing." });
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("⚠️ Define command is disabled.");
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command is currently disabled." });
        }

        const userId = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // Extract the word or phrase to define
        const query = text.split(' ').slice(1).join(' ').trim();
        if (!query) {
            return sock.sendMessage(userId, { text: "❌ Please provide a word or phrase to define. Example: !define example" });
        }

        const cooldownTime = config.cooldownTime * 1000; // Convert seconds to milliseconds

        // Check if the user is on cooldown
        if (cooldowns[userId] && Date.now() - cooldowns[userId] < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (Date.now() - cooldowns[userId])) / 1000);
            return sock.sendMessage(userId, { text: `⏳ Please wait ${remainingTime} seconds before using this command again.` });
        }

        // Update the cooldown for the user
        cooldowns[userId] = Date.now();

        try {
            // Fetch definition from Dictionary API
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
            if (!response.ok) {
                return sock.sendMessage(userId, { text: `❌ No definition found for "${query}".` });
            }

            const data = await response.json();
            const definitions = data[0]?.meanings.map(meaning => {
                const partOfSpeech = meaning.partOfSpeech;
                const definition = meaning.definitions[0]?.definition;
                return `(${partOfSpeech}) ${definition}`;
            }).join('\n\n');

            if (definitions) {
                await sock.sendMessage(userId, { text: `📖 Definition of "${query}":\n\n${definitions}` });
            } else {
                await sock.sendMessage(userId, { text: `❌ No definition found for "${query}".` });
            }
        } catch (error) {
            console.error(`Error fetching definition: ${error}`);
            await sock.sendMessage(userId, { text: "❌ An error occurred while fetching the definition. Please try again later." });
        }
    }
};
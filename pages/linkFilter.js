const fs = require('fs');
const path = require('path');

module.exports = {
    name: "linkFilter",
    runOnEveryMessage: true,
    async execute(sock, msg) {
        const pluginConfigPath = path.join(__dirname, 'json/linkFilter.json');

        // Check if the plugin config exists
        if (!fs.existsSync(pluginConfigPath)) {
            console.error("❌ Link Filter config file missing.");
            return;
        }

        const config = JSON.parse(fs.readFileSync(pluginConfigPath));

        // Check if the plugin is enabled
        if (!config.enabled) {
            console.log("🔧 Link Filter is disabled in the configuration.");
            return;
        }

        // Validate the action in the configuration
        if (!["kick", "warn"].includes(config.action)) {
            console.error("❌ Invalid action in configuration. Use 'kick' or 'warn'.");
            return;
        }

        const senderId = msg.key.participant || msg.key.remoteJid;
        const messageContent = 
            msg.message?.conversation || 
            msg.message?.extendedTextMessage?.text || 
            msg.message?.buttonsResponseMessage?.selectedButtonId || 
            msg.message?.templateButtonReplyMessage?.selectedId || 
            "";

        // Normalize the message content
        const normalizedContent = messageContent.replace(/\s+/g, ' ').trim();

        // Enhanced link detection using regex
        const linkRegex = /((https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}([^\s]*))/gi;
        const links = normalizedContent.match(linkRegex);

        if (links && links.length > 0) {
            console.log(`🔗 Detected links: ${links}`);
            if (!Array.isArray(config.allowedLinks) || config.allowedLinks.length === 0) {
                console.error("❌ Invalid or empty allowedLinks configuration.");
                return;
            }

            const isAllowed = links.every(link => {
                return config.allowedLinks.some(allowedLink => link.toLowerCase().includes(allowedLink.toLowerCase()));
            });

            if (!isAllowed) {
                console.log("❌ Unauthorized link detected.");
                try {
                    // Fetch group metadata to check sender's role
                    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
                    const participant = groupMetadata.participants.find(p => p.id === senderId);
                    let senderRole = "member";
                    if (participant) {
                        senderRole = participant.admin ? "admin" : "member";
                    }

                    if (!config.allowedRoles.includes(senderRole)) {
                        // Delete the message containing the link
                        await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
                        console.log(`🗑️ Deleted unauthorized link from ${senderId}.`);

                        if (config.action === "kick") {
                            // Notify the group that the user is being kicked
                            const kickMsg = config.kickMessage.replace('@user', `@${senderId.split('@')[0]}`);
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: kickMsg, mentions: [senderId] }
                            );

                            // Kick the user from the group
                            await sock.groupParticipantsUpdate(msg.key.remoteJid, [senderId], 'remove');
                            console.log(`❌ User ${senderId} was kicked for sharing unauthorized links.`);
                        } else if (config.action === "warn") {
                            // Warn the user
                            const warnMsg = config.warnMessage.replace('@user', `@${senderId.split('@')[0]}`);
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: warnMsg, mentions: [senderId] },
                                { quoted: msg }
                            );
                            console.log(`⚠️ User ${senderId} was warned for sharing unauthorized links.`);
                        }
                    }
                } catch (error) {
                    console.error("⚠️ Error while processing unauthorized link:", error);
                }
            }
        }
    }
};
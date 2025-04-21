const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { getRole, hasPermission } = require('./utils/roleUtils');
const { allowedGroups, prefix } = require('./config');
const chalk = require('chalk').default;

// Chalk colors for logging
const blue = chalk`{hex('#00bfff')}`; // Use .hex() for custom colors
const green = chalk.green;
const red = chalk.red;
const yellow = chalk.yellow;

// Ensure logs folder exists
const logsFolderPath = path.join(__dirname, 'logs');
if (!fs.existsSync(logsFolderPath)) {
    fs.mkdirSync(logsFolderPath);
}

// Generate a new log file for each bot start
const logFilePath = path.join(logsFolderPath, `botLogs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);

// Function to log messages to both console and log file
function logToFile(message) {
    const logMessage = `[${new Date().toISOString()}] ${message}\n`;
    console.log(logMessage); // Log to console
    fs.appendFileSync(logFilePath, logMessage); // Append to log file
}

// Function to load plugins dynamically
async function loadPlugins() {
    const plugins = {};
    const pluginFiles = fs.readdirSync("./pages");

    pluginFiles.forEach(file => {
        if (file.endsWith(".js")) {
            try {
                const plugin = require(`./pages/${file}`);
                plugins[plugin.name] = plugin;
                logToFile(`✅ Loaded plugin: ${plugin.name}`);
            } catch (error) {
                logToFile(`❌ Failed to load plugin ${file}: ${error}`);
            }
        }
    });

    return plugins;
}

// Safe reply function to handle message sending without errors
async function safeReply(sock, jid, message) {
    try {
        if (typeof message === 'string') {
            await sock.sendMessage(jid, { text: message });
        } else {
            await sock.sendMessage(jid, message);
        }
    } catch (error) {
        logToFile(`❌ Error sending message: ${error}`);
    }
}

// Start bot function
async function startBot() {
    logToFile("🤖 Bot is starting...");

    // Load authentication state
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({
        auth: state,
        browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
        syncFullHistory: true,
        qrTimeout: 20000, // Default QR timeout (20 sec)
        connectTimeoutMs: 60000 // Increase WebSocket connection timeout
    });

    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            logToFile("📸 Scan the QR Code below to connect your bot:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') {
            logToFile("✅ Bot is now connected!");
        } else if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                logToFile("🔄 Reconnecting...");
                setTimeout(startBot, 5000); // Auto-reconnect after 5 seconds
            } else {
                logToFile("❌ Logged out. Restart the bot and scan QR again.");
            }
        }
    });

    // Wait for the socket to fully initialize and get the `sock.info`
    sock.ev.on('ready', () => {
        logToFile(`Bot is ready with ID: ${sock.info.wid.user}`); // Now we can safely access sock.info
    });

    // Load all plugins dynamically
    const plugins = await loadPlugins();

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return; // Ignore empty messages

            const sender = msg.key.participant || msg.key.remoteJid;
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

            // Skip if it's from the bot itself
            if (sock.info && sender === sock.info.wid.user) return;

            // Skip messages from non-allowed groups
            if (msg.key.remoteJid.endsWith('@g.us') && !allowedGroups.includes(msg.key.remoteJid)) {
                return; // Ignore message from non-allowed groups silently
            }

            // Skip direct messages from numbers not in the allowed groups
            if (!msg.key.remoteJid.endsWith('@g.us') && !allowedGroups.includes(msg.key.remoteJid)) {
                return; // Ignore direct messages from non-allowed numbers
            }

            for (const pluginName in plugins) {
                const plugin = plugins[pluginName];
                if (plugin.runOnEveryMessage && typeof plugin.execute === 'function') {
                    plugin.execute(sock, msg);
                }
            }

            logToFile(`📩 Message from ${sender}: ${body}`);

            // If the message does not start with the prefix, ignore it
            if (!body.startsWith(prefix)) return;

            // Extract command and arguments
            const args = body.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Debug: Log the command and args
            logToFile(`📩 Command: ${commandName}, Arguments: ${args}`);

            // Check if the command file exists
            const commandFilePath = `./pages/${commandName}.js`;
            if (!fs.existsSync(commandFilePath)) {
                logToFile(`🚫 Command not found: ${commandName}`);
                return safeReply(sock, msg.key.remoteJid, `❌ Command not found: !${commandName}`);
            }

            // Check if the user has permission to run the command
            if (!hasPermission(sender, commandName)) {
                logToFile(`🚫 Permission denied for ${sender} to use command: ${commandName}`);
                return safeReply(sock, msg.key.remoteJid, `❌ You do not have permission to use !${commandName}`);
            }

            // Execute the command
            const command = require(commandFilePath);
            await command.execute(sock, msg, args);
        } catch (error) {
            logToFile(`❌ Error processing message: ${error}`);
        }
    });

    // Handle group participant updates
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id: groupId, participants, action } = update;

            // Only handle "add" action (new participants)
            if (action === 'add') {
                const welcomeConfigPath = './pages/json/welcome.json';

                // Check if the welcome config exists
                if (!fs.existsSync(welcomeConfigPath)) {
                    logToFile("❌ Welcome config file missing.");
                    return;
                }

                const config = JSON.parse(fs.readFileSync(welcomeConfigPath));

                // Check if the welcome feature is enabled
                if (!config.enabled) {
                    logToFile("⚠️ Welcome feature is disabled.");
                    return;
                }

                // Check if the group is in the allowed groups list
                if (!allowedGroups.includes(groupId)) {
                    return;
                }

                // Send a welcome message to each new participant
                for (const participant of participants) {
                    const username = `@${participant.split('@')[0]}`; // Format the username

                    // Ensure welcomeMessages array exists and has messages
                    if (!config.welcomeMessages || config.welcomeMessages.length === 0) {
                        logToFile("❌ No welcome messages found in the config.");
                        return;
                    }

                    // Randomly choose a welcome message from the config
                    const randomMessage = config.welcomeMessages[
                        Math.floor(Math.random() * config.welcomeMessages.length)
                    ].replace('@{{user}}', username);

                    // Send the welcome message to the group
                    await sock.sendMessage(groupId, {
                        text: randomMessage,
                        mentions: [participant], // Mention the new participant
                    });

                    logToFile(`👋 Sent welcome message to ${participant}`);
                }
            }
        } catch (error) {
            logToFile(`❌ Error in welcome function: ${error.message}`);
        }
    });
}

// Start the bot
startBot();

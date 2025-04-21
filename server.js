const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());


// Utility function to update JSON files
function updateJsonFile(fileName, req, res) {
    const filePath = path.join(__dirname, `pages/json/${fileName}.json`);
    try {
        const existing = JSON.parse(fs.readFileSync(filePath));
        const updated = {
            ...existing,
            ...req.body // Dynamically merge the incoming fields
        };
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
        res.sendStatus(200);
    } catch (error) {
        console.error(`Error updating ${fileName}.json:`, error);
        res.status(500).send({ message: 'Failed to update JSON file' });
    }
}

// Refactored routes
app.post('/update-json/help', (req, res) => updateJsonFile('help', req, res));
app.post('/update-json/kick', (req, res) => updateJsonFile('kick', req, res));
app.post('/update-json/welcome', (req, res) => updateJsonFile('welcome', req, res));
app.post('/update-json/news', (req, res) => updateJsonFile('news', req, res));
app.post('/update-json/all', (req, res) => updateJsonFile('all', req, res));
app.post('/update-json/tagall', (req, res) => updateJsonFile('tagall', req, res));
app.post('/update-json/add', (req, res) => updateJsonFile('add', req, res));
app.post('/update-json/link', (req, res) => updateJsonFile('link', req, res));

//app.post('/update-json/', (req, res) => updateJsonFile('', req, res));

// Middleware to serve static files
app.use(express.static(__dirname));
app.use(express.json());  // Allows parsing JSON request bodies

// Ensure the 'logs' folder exists
const logsDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDirectory)) {
    fs.mkdirSync(logsDirectory);
}

// HTML Routes (Serving static pages)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/plugins', (req, res) => res.sendFile(path.join(__dirname, 'plugins.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'settings.html')));

// Config Endpoints (Load and update config)
app.get('/config', (req, res) => {
    fs.readFile(path.join(__dirname, 'config.json'), 'utf8', (err, data) => {
        if (err) return res.status(500).send({ message: 'Failed to load config' });
        res.send(JSON.parse(data));
    });
});

app.post('/update-config', (req, res) => {
    const updatedConfig = req.body;
    fs.writeFile(path.join(__dirname, 'config.json'), JSON.stringify(updatedConfig, null, 4), 'utf8', (err) => {
        if (err) return res.status(500).send({ message: 'Failed to update config' });
        res.send({ message: 'Config updated successfully' });
    });
});

// Role Endpoints (Load and update roles)
app.get('/roles', (req, res) => {
    fs.readFile(path.join(__dirname, 'role.json'), 'utf8', (err, data) => {
        if (err) return res.status(500).send({ message: 'Failed to load roles' });
        res.send(JSON.parse(data));
    });
});

app.post('/update-roles', (req, res) => {
    const updatedRoles = req.body;
    fs.writeFile(path.join(__dirname, 'role.json'), JSON.stringify(updatedRoles, null, 4), 'utf8', (err) => {
        if (err) return res.status(500).send({ message: 'Failed to update roles' });
        res.send({ message: 'Roles updated successfully' });
    });
});

let botProcess = null;
let currentLogFile = 'botLogs_' + new Date().toISOString().replace(/:/g, '-') + '.txt'; // Create a new log file each time

// Start Bot
app.post('/start-bot', (req, res) => {
    if (botProcess) {
        return res.json({ status: 'already-running' });
    }

    // Create a new log file for each new start in the 'logs' directory
    currentLogFile = 'botLogs_' + new Date().toISOString().replace(/:/g, '-') + '.txt';
    const logFilePath = path.join(logsDirectory, currentLogFile); // Full path for the log file
    
    // Start the bot in detached mode to avoid the process being tied to the server lifecycle
    botProcess = spawn('node', ['bot.js'], {
        cwd: __dirname,  // Set current directory to the bot's directory
        detached: true,  // Run in detached mode
        stdio: ['ignore', 'pipe', 'pipe']  // Ignore input and output, but capture stderr and stdout
    });

    // Set up logging for bot process output
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    botProcess.stdout.on('data', (data) => {
        console.log(`Bot Output: ${data.toString()}`);
        logStream.write(data.toString() + '\n'); // Write to log file
    });

    botProcess.stderr.on('data', (data) => {
        console.error(`Bot Error: ${data.toString()}`);
        logStream.write('ERROR: ' + data.toString() + '\n'); // Write error to log file
    });

    botProcess.on('error', (err) => {
        console.error('❌ Failed to start bot:', err);
        botProcess = null;
        logStream.write('ERROR: Failed to start bot: ' + err + '\n');
    });

    botProcess.on('exit', (code) => {
        console.log(`⚠️ Bot exited with code: ${code}`);
        logStream.write(`Bot exited with code: ${code}\n`);
        botProcess = null;
        logStream.end();
    });

    res.json({ status: 'started' });
});

// Stop Bot
app.post('/stop-bot', (req, res) => {
    if (!botProcess) {
        return res.json({ status: 'not-running' });
    }

    // Kill the bot process gracefully
    process.kill(botProcess.pid, 'SIGTERM');
    botProcess = null;
    res.json({ status: 'stopped' });
});

// Bot Status
app.get('/bot-status', (req, res) => {
    res.json({ running: !!botProcess });
});

// Serve static files like the dashboard HTML
app.use(express.static('public'));

// API route to get the bot logs (returning current log file in 'logs' folder)
app.get('/bot-logs', (req, res) => {
    fs.readFile(path.join(logsDirectory, currentLogFile), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read log file' });
        }
        res.json({ logs: data });
    });
});

// Set up the server to listen on the specified port
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server is running on http://localhost:${PORT}`));

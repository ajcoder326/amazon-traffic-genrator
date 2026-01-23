const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jobManager = require('./src/services/jobManager');
const multiPhoneRotator = require('./src/services/multiPhoneRotator');
const mobileIPRotator = require('./src/services/mobileIPRotator');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure Storage for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Serve Static Files
app.use(express.static(path.join(__dirname, 'src/public')));
app.use(express.json());

// Routes
app.post('/api/upload', upload.fields([{ name: 'csv' }, { name: 'proxies' }]), (req, res) => {
    try {
        const files = req.files;
        if (!files.csv) {
            return res.status(400).json({ error: 'CSV file is required' });
        }

        const csvPath = files.csv[0].path;
        const proxyPath = files.proxies ? files.proxies[0].path : null;

        // In a real app, we would validate content here

        res.json({
            success: true,
            csvPath: csvPath,
            proxyPath: proxyPath,
            message: 'Files uploaded successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.post('/api/start', async (req, res) => {
    const { csvPath, proxyPath, settings } = req.body;
    console.log('Starting traffic generation:', { csvPath, settings });

    try {
        jobManager.setSocketIo(io);
        const result = await jobManager.startJob({
            csvPath,
            proxyPath,
            settings
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({ success: true, message: 'Traffic generation started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stop', (req, res) => {
    jobManager.stopJob();
    res.json({ success: true });
});

// API to scan connected phones
app.get('/api/scan-phones', async (req, res) => {
    try {
        const devices = await multiPhoneRotator.scanDevices();
        res.json({ 
            success: true, 
            devices: devices.map(d => ({
                id: d.id,
                model: d.model,
                carrier: d.carrier,
                androidVersion: d.androidVersion
            }))
        });
    } catch (error) {
        res.json({ success: false, error: error.message, devices: [] });
    }
});

// API to check single phone status
app.get('/api/phone-status', async (req, res) => {
    try {
        const mobileIPRotator = require('./src/services/mobileIPRotator');
        const connected = await mobileIPRotator.checkConnection();
        
        if (connected) {
            const deviceInfo = await mobileIPRotator.getDeviceInfo();
            res.json({
                success: true,
                connected: true,
                deviceInfo: deviceInfo
            });
        } else {
            res.json({
                success: true,
                connected: false,
                message: 'No phone connected'
            });
        }
    } catch (error) {
        res.json({ success: false, connected: false, error: error.message });
    }
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Client connected');

    // Send current state (mocked for now)
    socket.emit('status', {
        state: 'idle',
        message: 'Ready to start'
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

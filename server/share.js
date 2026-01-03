const localtunnel = require('localtunnel');
const { spawn } = require('child_process');

console.log('🚀 Starting Traffic Generator Server...');

// 1. Start the Node.js Server
const serverProcess = spawn('node', ['server.js'], { stdio: 'pipe', shell: true });

serverProcess.stdout.on('data', (data) => {
    const log = data.toString();
    process.stdout.write(`[SERVER] ${log}`);

    // Once server is ready, start tunnel
    if (log.includes('Server running')) {
        startTunnel();
    }
});

serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR] ${data.toString()}`);
});

async function startTunnel() {
    console.log('🌐 Establishing Public Tunnel...');
    try {
        const tunnel = await localtunnel({ port: 3000 });

        console.log('\n==================================================');
        console.log('✅ APP IS LIVE ON THE INTERNET!');
        console.log(`🔗 PUBLIC URL: ${tunnel.url}`);
        console.log('==================================================\n');
        console.log('⚠️  Note: If asked for a password, it might be your IP.');
        console.log('ℹ️  Share this URL to access the dashboard remotely.');

        tunnel.on('close', () => {
            console.log('Tunnel closed');
        });
    } catch (err) {
        console.error('Tunnel Error:', err);
    }
}

// Handle exit
process.on('SIGINT', () => {
    console.log('Stopping...');
    serverProcess.kill();
    process.exit();
});

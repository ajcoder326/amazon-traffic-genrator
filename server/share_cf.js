const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Traffic Generator Server...');

// 1. Start the Node.js Server
const serverProcess = spawn('node', ['server.js'], { stdio: 'pipe', shell: true });

serverProcess.stdout.on('data', (data) => {
    const log = data.toString();
    // process.stdout.write(`[SERVER] ${log}`);

    // Once server is ready, start tunnel
    if (log.includes('Server running')) {
        console.log('[SERVER] is ready on port 3000');
        startCloudflare();
    }
});

serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR] ${data.toString()}`);
});

function startCloudflare() {
    console.log('☁️  Starting Cloudflare Tunnel...');

    if (!fs.existsSync('cloudflared.exe')) {
        console.error('❌ cloudflared.exe not found! Please download it.');
        return;
    }

    // Run: cloudflared tunnel --url http://localhost:3000
    const cf = spawn('cloudflared.exe', ['tunnel', '--url', 'http://localhost:3000'], { stdio: 'pipe', shell: true });

    cf.stderr.on('data', (data) => {
        const output = data.toString();
        // Cloudflare outputs the URL in stderr (informational logs)
        // Looking for lines like: https://[random].trycloudflare.com
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match) {
            console.log('\n==================================================');
            console.log('✅ CLOUDFLARE TUNNEL IS LIVE!');
            console.log(`🔗 PUBLIC URL: ${match[0]}`);
            console.log('==================================================\n');
        }
    });

    cf.on('close', (code) => {
        console.log(`Cloudflare exited with code ${code}`);
    });
}

// Handle exit
process.on('SIGINT', () => {
    console.log('Stopping...');
    serverProcess.kill();
    process.exit();
});

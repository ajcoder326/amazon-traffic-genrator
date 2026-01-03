const fs = require('fs');

const raw = fs.readFileSync('../proxies_raw.txt', 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

const proxies = lines.map(line => {
    const parts = line.trim().split(':');
    return {
        ip: parts[0],
        port: parseInt(parts[1]),
        user: parts[2],
        pass: parts[3]
    };
});

fs.writeFileSync('proxies.json', JSON.stringify(proxies, null, 2));
console.log(`Converted ${proxies.length} proxies to proxies.json`);

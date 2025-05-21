// Display local IP addresses for sharing
const os = require('os');

function getLocalIpAddresses() {
    const networkInterfaces = os.networkInterfaces();
    const ipAddresses = [];

    Object.keys(networkInterfaces).forEach(interfaceName => {
        const interfaces = networkInterfaces[interfaceName];

        interfaces.forEach(interface => {
            // Skip internal interfaces and IPv6 addresses
            if (!interface.internal && interface.family === 'IPv4') {
                ipAddresses.push({
                    interface: interfaceName,
                    address: interface.address
                });
            }
        });
    });

    return ipAddresses;
}

const ipAddresses = getLocalIpAddresses();
console.log('\n🌐 Your local network IP addresses:');
if (ipAddresses.length === 0) {
    console.log('  No network connections found.');
} else {
    ipAddresses.forEach(ip => {
        console.log(`  → ${ip.interface}: http://${ip.address}:5000 (server)`);
        console.log(`  → ${ip.interface}: http://${ip.address}:5173 (client)`);
    });
}
console.log('\nShare these links with people on your network to access the application.\n');

module.exports = { getLocalIpAddresses };

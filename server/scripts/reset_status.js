const store = require('../store');

async function main() {
    try {
        console.log('Resetting status for bus_demo...');
        // Force status to stopped
        await store.updateBusStatus('bus_demo', 'stopped');
        console.log('Update success');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();

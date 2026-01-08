const store = require('../store');

async function main() {
    try {
        console.log('Forcing location update for bus_demo...');
        await store.updateLocation('bus_demo', 31.2982, 75.5626, 45); // Punjab coords, speed 45
        console.log('Update success');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();

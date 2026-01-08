const store = require('../store');

async function main() {
    try {
        console.log('--- USERS ---');
        const drivers = await store.getUsersByRole('driver');
        console.log('Drivers:', drivers);

        console.log('\n--- BUSES ---');
        const buses = await store.getBuses();
        console.log('Buses:', buses);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();

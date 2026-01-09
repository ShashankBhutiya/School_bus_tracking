const store = require('../store');

async function checkDrivers() {
    try {
        console.log("Fetching drivers from DB...");
        const drivers = await store.getUsersByRole('driver');
        console.log("Drivers found:", drivers.length);
        console.log(JSON.stringify(drivers, null, 2));
    } catch (error) {
        console.error("Error fetching drivers:", error);
    }
}

checkDrivers();

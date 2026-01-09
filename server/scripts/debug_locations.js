const db = require('../db');

async function checkLocations() {
    try {
        console.log('📍 Checking Live Locations...');
        const res = await db.query('SELECT * FROM live_locations');
        console.table(res.rows.map(r => ({
            bus_id: r.bus_id,
            lat: r.latitude,
            lng: r.longitude,
            age_mins: (Date.now() - Number(r.timestamp)) / 60000
        })));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLocations();

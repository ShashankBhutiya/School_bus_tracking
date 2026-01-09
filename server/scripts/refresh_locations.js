const db = require('../db');

async function refreshLocations() {
    try {
        console.log('🔄 Refreshing Location Timestamps...');
        const now = Date.now();
        await db.query('UPDATE live_locations SET timestamp = $1', [now]);
        console.log('✅ All locations updated to now.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

refreshLocations();

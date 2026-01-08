const db = require('../db');

async function main() {
    try {
        console.log('Clearing live_locations table...');
        await db.query('TRUNCATE TABLE live_locations');
        console.log('Cleared live_locations.');

        // Also verify
        const res = await db.query('SELECT * FROM live_locations');
        console.log('Remaining locations:', res.rows.length);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();

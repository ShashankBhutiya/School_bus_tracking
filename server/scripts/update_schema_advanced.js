const db = require('../db');

const updateSchema = async () => {
    try {
        console.log('Updating schema for Advanced Features...');

        // 1. Buses Table Enhancement (Status)
        // Check if column exists, if not add it. PG requires separate query or DO block. Simple way:
        await db.query(`ALTER TABLE buses ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'stopped';`);
        await db.query(`ALTER TABLE buses ADD COLUMN IF NOT EXISTS assigned_route_id TEXT;`);

        // 2. Routes Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS routes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                waypoints JSONB,
                estimated_distance FLOAT
            );
        `);

        // 3. Trips Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                bus_id TEXT REFERENCES buses(id),
                driver_id TEXT REFERENCES users(id),
                start_time BIGINT,
                end_time BIGINT,
                status TEXT,
                distance_covered FLOAT DEFAULT 0
            );
        `);

        // 4. Trip Logs
        await db.query(`
            CREATE TABLE IF NOT EXISTS trip_logs (
                trip_id TEXT REFERENCES trips(id),
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                speed FLOAT,
                timestamp BIGINT
            );
        `);

        // 5. Attendance
        await db.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id TEXT PRIMARY KEY,
                trip_id TEXT REFERENCES trips(id),
                student_id TEXT REFERENCES students(id),
                status TEXT,
                timestamp BIGINT,
                location_lat DOUBLE PRECISION,
                location_lng DOUBLE PRECISION
            );
        `);

        // 6. Geofences
        await db.query(`
            CREATE TABLE IF NOT EXISTS geofences (
                id TEXT PRIMARY KEY,
                name TEXT,
                type TEXT,
                coordinates JSONB,
                alert_active BOOLEAN DEFAULT true
            );
        `);

        // 7. Live Locations
        await db.query(`
            CREATE TABLE IF NOT EXISTS live_locations (
                bus_id TEXT PRIMARY KEY,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                timestamp BIGINT
            );
        `);

        await db.query(`ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS speed FLOAT;`);

        console.log('Schema updated successfully.');

    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        process.exit();
    }
};

updateSchema();

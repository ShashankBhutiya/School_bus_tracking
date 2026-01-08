const db = require('../db');

const createTables = async () => {
    try {
        console.log('Creating tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS buses (
                id TEXT PRIMARY KEY,
                bus_number TEXT NOT NULL,
                driver_id TEXT,
                route_name TEXT
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                bus_id TEXT,
                pickup_lat DOUBLE PRECISION,
                pickup_lng DOUBLE PRECISION
            );
        `);

        // Live locations: using bus_id as PK to ensure one entry per bus
        await db.query(`
            CREATE TABLE IF NOT EXISTS live_locations (
                bus_id TEXT PRIMARY KEY,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                timestamp BIGINT
            );
        `);

        console.log('Tables created successfully.');

        // Seed initial data if empty
        const userCheck = await db.query('SELECT * FROM users LIMIT 1');
        if (userCheck.rowCount === 0) {
            console.log('Seeding initial data...');
            await db.query("INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ('1', 'Admin User', 'admin@school.com', '1234567890', '123', 'admin')");
            await db.query("INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ('2', 'Parent One', 'parent@school.com', '9876543210', '123', 'parent')");
            await db.query("INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ('3', 'Driver Bob', 'driver@school.com', '5555555555', '123', 'driver')");

            await db.query("INSERT INTO buses (id, bus_number, driver_id, route_name) VALUES ('b1', 'BUS-001', '3', 'Route A (North Area)')");

            await db.query("INSERT INTO students (id, name, parent_id, bus_id, pickup_lat, pickup_lng) VALUES ('s1', 'Student Junior', '2', 'b1', 28.61, 77.20)");

            console.log('Seeding complete.');
        }

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        process.exit();
    }
};

createTables();

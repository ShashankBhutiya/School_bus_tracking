const db = require('./db');

// Users
const findUserByEmail = async (email) => {
    const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
};

const findUserById = async (id) => {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
};

const addUser = async (user) => {
    const { id, name, email, phone, password_hash, role } = user;
    await db.query(
        'INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, name, email, phone, password_hash, role]
    );
    return user;
};

const updateUser = async (id, user) => {
    const { name, email, phone, role } = user;
    // Not updating password for now to keep it simple, or add if needed
    await db.query(
        'UPDATE users SET name = $1, email = $2, phone = $3, role = $4 WHERE id = $5',
        [name, email, phone, role, id]
    );
    return { id, ...user };
};

const removeUser = async (id) => {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
};

const getUsers = async () => {
    const res = await db.query('SELECT * FROM users');
    return res.rows;
};

const getUsersByRole = async (role) => {
    const res = await db.query('SELECT * FROM users WHERE role = $1', [role]);
    return res.rows;
};

// Status & Routes
const updateBusStatus = async (busId, status) => {
    await db.query('UPDATE buses SET current_status = $1 WHERE id = $2', [status, busId]);
    return { id: busId, status };
};

const getRoutes = async () => {
    const res = await db.query('SELECT * FROM routes');
    return res.rows;
};

const addRoute = async (route) => {
    const { id, name, waypoints, estimated_distance } = route;
    await db.query(
        'INSERT INTO routes (id, name, waypoints, estimated_distance) VALUES ($1, $2, $3, $4)',
        [id, name, JSON.stringify(waypoints), estimated_distance]
    );
    return route;
};

// Buses (Enhanced)
const getBuses = async () => {
    const res = await db.query('SELECT * FROM buses');
    const buses = res.rows;
    // Attach live locations
    const locRes = await db.query('SELECT * FROM live_locations');
    const locMap = locRes.rows.reduce((acc, loc) => {
        acc[loc.bus_id] = loc;
        return acc;
    }, {});

    return buses.map(bus => ({
        ...bus,
        location: locMap[bus.id] || null
    }));
};

const findBusById = async (id) => {
    const res = await db.query('SELECT * FROM buses WHERE id = $1', [id]);
    const bus = res.rows[0];
    if (bus) {
        const locRes = await db.query('SELECT * FROM live_locations WHERE bus_id = $1', [id]);
        bus.location = locRes.rows[0] || null;
    }
    return bus;
};

const addBus = async (bus) => {
    const { id, bus_number, driver_id, route_name } = bus;
    await db.query(
        'INSERT INTO buses (id, bus_number, driver_id, route_name) VALUES ($1, $2, $3, $4)',
        [id, bus_number, driver_id, route_name]
    );
    return bus;
};

const updateBus = async (id, bus) => {
    const { bus_number, driver_id, route_name } = bus;
    await db.query(
        'UPDATE buses SET bus_number = $1, driver_id = $2, route_name = $3 WHERE id = $4',
        [bus_number, driver_id, route_name, id]
    );
    return { id, ...bus };
};

const removeBus = async (id) => {
    await db.query('DELETE FROM buses WHERE id = $1', [id]);
};

// Students
const getStudents = async () => {
    const res = await db.query('SELECT * FROM students');
    return res.rows;
};

const addStudent = async (student) => {
    const { id, name, parent_id, bus_id, pickup_lat, pickup_lng } = student;
    await db.query(
        'INSERT INTO students (id, name, parent_id, bus_id, pickup_lat, pickup_lng) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, name, parent_id, bus_id, pickup_lat, pickup_lng]
    );
    return student;
};

const updateStudent = async (id, student) => {
    const { name, parent_id, bus_id, pickup_lat, pickup_lng } = student;
    await db.query(
        'UPDATE students SET name = $1, parent_id = $2, bus_id = $3, pickup_lat = $4, pickup_lng = $5 WHERE id = $6',
        [name, parent_id, bus_id, pickup_lat, pickup_lng, id]
    );
    return { id, ...student };
};

const removeStudent = async (id) => {
    await db.query('DELETE FROM students WHERE id = $1', [id]);
};

const findStudentsByParentId = async (parentId) => {
    const res = await db.query('SELECT * FROM students WHERE parent_id = $1', [parentId]);
    return res.rows;
};

const findStudentByParentAndBus = async (parentId, busId) => {
    const res = await db.query('SELECT * FROM students WHERE parent_id = $1 AND bus_id = $2', [parentId, busId]);
    return res.rows[0];
};

// Live Locations
const updateLocation = async (busId, lat, lng, speed) => {
    const timestamp = Date.now();
    await db.query(
        `INSERT INTO live_locations (bus_id, latitude, longitude, timestamp, speed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (bus_id)
         DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, timestamp = EXCLUDED.timestamp, speed = EXCLUDED.speed`,
        [busId, lat, lng, timestamp, speed || 0]
    );
    return { bus_id: busId, latitude: lat, longitude: lng, timestamp, speed: speed || 0 };
};


const getLiveLocations = async () => {
    const res = await db.query('SELECT * FROM live_locations');
    // Convert array to map { busId: locationObj }
    return res.rows.reduce((acc, loc) => {
        acc[loc.bus_id] = loc;
        return acc;
    }, {});
};

const getStudentsByBus = async (busId) => {
    // Get students and their latest attendance for TODAY
    const res = await db.query(`
        SELECT s.*, 
               (SELECT status FROM attendance WHERE student_id = s.id AND date = CURRENT_DATE ORDER BY timestamp DESC LIMIT 1) as today_status
        FROM students s 
        WHERE s.bus_id = $1
    `, [busId]);
    return res.rows;
};

const markAttendance = async (studentId, status, busId) => {
    // Insert into attendance log
    await db.query(
        'INSERT INTO attendance (student_id, bus_id, date, status, timestamp) VALUES ($1, $2, CURRENT_DATE, $3, NOW())',
        [studentId, busId, status]
    );
    return { studentId, status };
};

// History
const getTripLogs = async (busId) => {
    // Return last 1 hour logs or specific date. For demo, just get all recent logs limit 1000
    // In prod, filter by trip_id or date. 
    // Since we don't have proper trip sessions fully integrated yet, just return recent.
    const res = await db.query('SELECT * FROM trip_logs WHERE trip_id IN (SELECT id FROM trips WHERE bus_id = $1) ORDER BY timestamp ASC LIMIT 500', [busId]);

    // Fallback: if no trips linked, return empty or implement a simpler log table query if logs had bus_id directly.
    // Our schema put bus_id in `trips`, logs have `trip_id`. 
    // Let's assume for now we might fetch logs directly if we modified schema or just simplify.
    // Actually schema was: trip_logs(trip_id...). Buses -> Trips -> Logs.
    // So we need to find the latest trip.
    const tripRes = await db.query('SELECT id FROM trips WHERE bus_id = $1 ORDER BY start_time DESC LIMIT 1', [busId]);
    if (tripRes.rows.length === 0) return [];

    const tripId = tripRes.rows[0].id;
    const logsRes = await db.query('SELECT * FROM trip_logs WHERE trip_id = $1 ORDER BY timestamp ASC', [tripId]);
    return logsRes.rows;
};

module.exports = {
    findUserByEmail, findUserById, addUser, removeUser, getUsers, getUsersByRole,
    getBuses, findBusById, addBus, removeBus, updateBus,
    getStudents, addStudent, removeStudent, findStudentsByParentId, findStudentByParentAndBus, updateStudent,
    updateLocation, getLiveLocations, getStudentsByBus, markAttendance,
    updateBusStatus, getRoutes, addRoute, getTripLogs, updateUser
};

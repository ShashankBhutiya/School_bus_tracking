const db = require('../db');

async function listUsers() {
    try {
        const res = await db.query('SELECT id, name, email, role, password_hash FROM users');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listUsers();

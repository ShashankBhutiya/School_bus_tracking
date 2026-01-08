const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:aFlU3P9NLO3UDwQB@db.kjyhqlwlfyyyosfnnqvk.supabase.co:5432/postgres';

const pool = new Pool({
    connectionString,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};

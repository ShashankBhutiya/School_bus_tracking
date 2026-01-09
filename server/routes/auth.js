const express = require('express');
const router = express.Router();
const store = require('../store');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find by email
        const user = await store.findUserByEmail(email);

        // Check if user exists
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Verify password
        const bcrypt = require('bcryptjs');
        const valid = await bcrypt.compare(password, user.password_hash);

        if (user && valid) {
            const { password_hash, ...userInfo } = user;
            const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ success: true, user: userInfo, token });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

// routes/auth.js
const express = require("express");
const router = express.Router();

// Fixed credentials
const ADMIN_EMAIL = "admin@advocate.com";
const ADMIN_PASSWORD = "adv12345";

// POST /api/auth/login
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required" });
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return res.json({ success: true, message: "Login successful" });
    } else {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

module.exports = router;

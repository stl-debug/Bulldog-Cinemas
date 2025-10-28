const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const { encryptText } = require('../utils/crypto');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Helper to generate random tokens
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// register email 
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, promotions } = req.body;

        if (!email || !password)
            return res.status(400).json({ error: 'Email and password required' });

        const existing = await User.findOne({ email });
        if (existing)
            return res.status(409).json({ error: 'Email already registered' });

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const emailConfirmToken = generateToken();

        const user = new User({
            email,
            passwordHash,
            firstName,
            lastName,
            promotions: Boolean(promotions),
            emailConfirmToken,
            status: 'Inactive',
        });

        await user.save();

        const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email/${emailConfirmToken}`;

        await sendEmail(
            email,
            'Confirm your Cinema account',
            `<p>Hello ${firstName || ''},</p>
            <p>Please confirm your email by clicking the link below:</p>
            <a href="${confirmUrl}">${confirmUrl}</a>
            <p>If you didn't register, ignore this email.</p>`
        );

        return res
            .status(201)
            .json({ message: 'Registration successful. Please check your email to confirm.' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// confirm email
router.get('/confirm-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({ emailConfirmToken: req.params.token });
        if (!user) return res.status(404).json({ error: 'Invalid token' });

        user.status = 'Active';
        user.emailConfirmToken = undefined;
        await user.save();

        res.redirect(`${process.env.FRONTEND_URL}/email-confirmed`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// login user 
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        if (user.status !== 'Active')
            return res.status(403).json({ error: 'Please confirm your email first' });
        
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// logout user
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out' });
});

// forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'Unknown email' });

        const token = generateToken();
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; 

        await user.save();

        const resetURL = `http://localhost:3000/reset-password/${token}`;

        await sendEmail(
            email,
            'Reset your password',
            `<p>Click <a href="${resetURL}">${resetURL}</a> to reset your password (1 hour)</p>`
        );

        res.json({ message: 'Password reset email sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword)
            return res.status(400).json({ error: 'Missing token or password' });

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

        user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        await sendEmail(user.email, 'Password changed', '<p>Your password was changed successfully.</p>');

        res.json({ message: 'Password reset OK' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

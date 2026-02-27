const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { db } = require('../firebase');
require('dotenv').config();

const router = express.Router();

// 2Factor.in configuration
const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const TWO_FACTOR_BASE_URL = 'https://2factor.in/API/V1';

// No server-side state is needed with 2Factor.in; it returns a sessionId

// Check if user exists
router.post('/checkUser', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const userRef = db.collection('users').doc(phoneNumber);
    const userDoc = await userRef.get();

    return res.status(200).json({ exists: userDoc.exists });
  } catch (error) {
    console.error('Check user error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Send OTP using 2Factor.in (SMS)
router.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber || phoneNumber.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const fullPhoneNumber = `+91${phoneNumber}`;

  try {
    if (!TWO_FACTOR_API_KEY) {
      return res.status(500).json({ error: 'OTP service not configured' });
    }

    const response = await axios.get(
      `${TWO_FACTOR_BASE_URL}/${TWO_FACTOR_API_KEY}/SMS/${fullPhoneNumber}/AUTOGEN`
    );

    if (response.data && response.data.Status === 'Success') {
      const sessionId = response.data.Details;
      return res.status(200).json({ sessionId });
    }

    return res.status(500).json({ error: 'Failed to send OTP' });
  } catch (error) {
    const detail = error?.response?.data || error?.message || 'Unknown error';
    console.error('Error sending OTP via 2Factor:', detail);
    res.status(500).json({ error: 'Failed to send OTP', details: detail });
  }
});

// Verify OTP using 2Factor.in
router.post('/verify-otp', async (req, res) => {
  const { sessionId, otp } = req.body;

  if (!sessionId || !otp) {
    return res.status(400).json({ error: 'Session ID and OTP are required' });
  }

  try {
    if (!TWO_FACTOR_API_KEY) {
      return res.status(500).json({ error: 'OTP service not configured' });
    }

    const response = await axios.get(
      `${TWO_FACTOR_BASE_URL}/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
    );

    if (response.data && response.data.Status === 'Success') {
      return res.status(200).json({ message: 'OTP verified successfully' });
    }

    return res.status(400).json({ error: 'Invalid OTP' });
  } catch (error) {
    const detail = error?.response?.data || error?.message || 'OTP verification failed';
    console.error('Error verifying OTP via 2Factor:', detail);
    res.status(400).json({ error: 'Invalid OTP' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const userRef = db.collection('users').doc(phoneNumber);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    await userRef.set({
      phoneNumber,
      password: password || null,
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    const token = jwt.sign(
      { userId: phoneNumber, phoneNumber, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ message: 'User registered successfully', token, role: 'user' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { phoneNumber, password } = req.body;

  try {
    const userRef = db.collection('users').doc(phoneNumber);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const user = userDoc.data();

    // Check password or PIN as fallback
    const isValidPassword = user.password && user.password === password;
    const isValidPin = user.pin && user.pin === password;

    if (!isValidPassword && !isValidPin) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const role = user.role || 'user';

    const token = jwt.sign(
      { userId: userDoc.id, phoneNumber: user.phoneNumber, role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token, role });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

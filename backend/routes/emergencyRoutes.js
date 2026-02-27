const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');

const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

function is24Hours(periods) {
  if (!periods || !Array.isArray(periods)) return false;
  const day = periods.find(p => p.open);
  if (!day) return false;
  return day.open?.day === 0 && day.open?.time === '0000' && (!day.close || (day.close.day === 0 && day.close.time === '2359'));
}

// GET /emergency/places — proxy to Google Places Nearby Search
router.get('/places', authenticateToken, async (req, res) => {
  try {
    if (!PLACES_API_KEY) {
      return res.status(503).json({ error: 'Places API not configured' });
    }
    const { lat, lng, radius = 5000, types, openNow } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ error: 'Valid lat and lng are required' });
    }
    const radiusM = Math.min(Math.max(parseInt(radius, 10) || 5000, 500), 50000);
    let typeParam = 'pharmacy';
    if (types) {
      const allowed = ['pharmacy', 'hospital', 'doctor', 'health'];
      const requested = types.split(',').map(t => t.trim()).filter(t => allowed.includes(t));
      if (requested.length) typeParam = requested[0];
    }
    const url = `${PLACES_BASE}/nearbysearch/json`;
    const params = {
      location: `${latitude},${longitude}`,
      radius: radiusM,
      type: typeParam,
      key: PLACES_API_KEY,
    };
    if (openNow === 'true') params.opennow = 'true';
    const response = await axios.get(url, { params, timeout: 10000 });
    const data = response.data;
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      const errMsg = data.error_message || '(no message from Google)';
      console.error('[Places API]', data.status, errMsg);
      return res.status(502).json({
        error: 'Places request failed',
        status: data.status,
        message: errMsg,
      });
    }
    const results = (data.results || []).slice(0, 20).map(place => ({
      id: place.place_id,
      name: place.name,
      type: typeParam,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      vicinity: place.vicinity,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      openNow: place.opening_hours?.open_now,
      is24Hours: is24Hours(place.opening_hours?.periods),
    }));
    const placeIds = results.map(r => r.id).filter(Boolean).slice(0, 5);
    let detailsMap = {};
    if (placeIds.length > 0) {
      const detailsUrl = `${PLACES_BASE}/details/json`;
      for (const placeId of placeIds) {
        try {
          const detailRes = await axios.get(detailsUrl, {
            params: { place_id: placeId, fields: 'formatted_phone_number,opening_hours', key: PLACES_API_KEY },
            timeout: 5000,
          });
          const detail = detailRes.data?.result;
          if (detail) {
            detailsMap[placeId] = {
              phoneNumber: detail.formatted_phone_number || null,
              is24Hours: is24Hours(detail.opening_hours?.periods),
            };
          }
        } catch (_) {}
      }
    }
    const withPhone = results.map(r => ({
      ...r,
      phoneNumber: detailsMap[r.id]?.phoneNumber || null,
      is24Hours: detailsMap[r.id]?.is24Hours ?? r.is24Hours,
    }));
    res.json({ success: true, places: withPhone });
  } catch (err) {
    console.error('Emergency places error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch places' });
  }
});

module.exports = router;

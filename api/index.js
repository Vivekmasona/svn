const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Public Invidious instance (jo direct playback ke liye best hai)
const BASE_URL = 'https://inv.tux.digital';

app.get('/play', async (req, res) => {
    const songQuery = req.query.query;
    if (!songQuery) return res.status(400).json({ error: "Missing query" });

    try {
        // 1. Search Video ID
        const searchRes = await axios.get(`${BASE_URL}/api/v1/search?q=${encodeURIComponent(songQuery)}&type=video`);
        if (!searchRes.data || searchRes.data.length === 0) return res.status(404).json({ error: "Not found" });

        const videoId = searchRes.data[0].videoId;

        // 2. Fetch Direct Stream URL
        // Invidious API native format URL provide karti hai bina session ke
        const streamRes = await axios.get(`${BASE_URL}/api/v1/videos/${videoId}`);
        const formats = streamRes.data.adaptiveFormats;
        
        // Audio stream nikalna
        const audio = formats.find(f => f.type.startsWith('audio/')) || formats[0];

        if (audio && audio.url) {
            // Direct redirect to googlevideo.com
            return res.redirect(audio.url);
        }

        return res.status(404).json({ error: "No stream found" });
    } catch (e) {
        return res.status(500).json({ error: "Playback failed", details: e.message });
    }
});

module.exports = app;


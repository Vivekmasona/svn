const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    const youtubeUrl = req.query.url;

    // Default response type JSON set karein errors ke liye
    res.setHeader('Content-Type', 'application/json');

    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        // Cobalt v10/v11 standards ke mutabik 'https://sunny.imput.net/' par POST request bhejenge
        const response = await axios.post('https://sunny.imput.net/', {
            url: youtubeUrl,
            videoQuality: '720',
            audioFormat: 'mp3',   // Hame audio chahiye
            audioBitrate: '128',
            filenamePattern: 'classic',
            isAudioOnly: true,    // Audio separate nikalne ke liye
            isNoTTWatermark: true
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                // User-Agent dena zaroori hai taaki request block na ho
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;

        // Agar Sunny instance ne successful processing ke baad direct link de diya
        if (data && data.url) {
            // DIRECT PLAY: Browser ko direct stream link par redirect kar do
            return res.redirect(data.url);
        } else {
            return res.status(500).json({
                error: "Could not fetch direct stream URL from Sunny instance.",
                sunny_response: data
            });
        }

    } catch (error) {
        console.error("Sunny Instance Error:", error.message);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to stream audio via Sunny Cobalt instance.",
            details: error.response ? error.response.data : error.message
        });
    }
});

module.exports = app;

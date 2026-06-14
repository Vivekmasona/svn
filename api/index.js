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
        // Cobalt v10 ka naya endpoint aur sahi request body format
        const response = await axios.post('https://api.cobalt.tools/', {
            url: youtubeUrl,
            videoQuality: '720', // Default quality
            audioFormat: 'mp3',   // Hame audio chahiye
            audioBitrate: '128',
            filenamePattern: 'classic',
            isAudioOnly: true,    // V10 me audio only ke liye ye key zaroori hai
            isNoTTWatermark: true
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;

        // Cobalt v10 response status check karne ke liye 'status' key deta hai
        // Status 'redirect' ya 'stream' hone par direct 'url' milti hai
        if (data && data.url) {
            // DIRECT PLAY: Browser ko direct stream link par redirect kar do
            return res.redirect(data.url);
        } else {
            return res.status(500).json({
                error: "Could not fetch direct stream URL from Cobalt v10.",
                cobalt_response: data
            });
        }

    } catch (error) {
        console.error("Cobalt v10 Streaming Error:", error.message);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to stream audio via Cobalt v10 engine.",
            details: error.response ? error.response.data : error.message
        });
    }
});

module.exports = app;

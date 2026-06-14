const express = require('express');
const ytStream = require('yt-stream');
const app = express();

app.get('/play', async (req, res) => {
    const youtubeUrl = req.query.url;

    // Errors ke liye default content-type set karein
    res.setHeader('Content-Type', 'application/json');

    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        // 1. YouTube se direct stream info nikalna bina kisi third-party API ke
        const stream = await ytStream.stream(youtubeUrl, {
            quality: 'high',
            type: 'audio',
            highWaterMark: 1048576 * 32 // Buffering behtar karne ke liye
        });

        if (stream && stream.url) {
            // 2. DIRECT PLAY: Browser ko seedhe Google ke official audio link par bhej do
            return res.redirect(stream.url);
        } else {
            return res.status(404).json({ error: "Could not extract raw audio stream URL." });
        }

    } catch (error) {
        console.error("Local Scraper Error:", error.message);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "YouTube local scraping failed. Serverless IP might be restricted.",
            details: error.message
        });
    }
});

module.exports = app;


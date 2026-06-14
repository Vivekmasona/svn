const express = require('express');
const ytdl = require('@distube/ytdl-core');
const os = require('os');
const path = require('path');
const app = express();

app.use(express.json());

// VERCEL FIX: Cache directory ko /tmp folder mein redirect karna
// Isse ytdl ki 'EROFS' wali error kabhi nahi aayegi.
process.env.YTDL_CACHE_DIR = path.join('/tmp', 'ytdl-cache');

app.get('/video-info', async (req, res) => {
    const videoUrlOrId = req.query.url || req.query.id;
    res.setHeader('Content-Type', 'application/json');

    if (!videoUrlOrId) {
        return res.status(400).json({ success: false, error: "Provide 'url' or 'id'." });
    }

    try {
        const streamOptions = {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            }
        };

        // Info fetch
        const info = await ytdl.getInfo(videoUrlOrId, streamOptions);

        const videoDump = {
            success: true,
            title: info.videoDetails.title,
            formats: info.formats.map(f => ({
                quality: f.qualityLabel || f.audioQuality,
                url: f.url,
                container: f.container,
                mimeType: f.mimeType
            }))
        };

        return res.status(200).json(videoDump);

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: "Engine failed", 
            details: error.message 
        });
    }
});

module.exports = app;


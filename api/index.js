const express = require('express');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const app = express();

app.use(express.json());

// Force use of tmp for cache
process.env.YTDL_CACHE_DIR = path.join('/tmp', 'ytdl-cache');

app.get('/video-info', async (req, res) => {
    const videoUrlOrId = req.query.url || req.query.id;
    res.setHeader('Content-Type', 'application/json');

    if (!videoUrlOrId) {
        return res.status(400).json({ success: false, error: "Provide 'url' or 'id'." });
    }

    try {
        // Manual Android Agent Config (Koi external path ki zaroorat nahi)
        const agent = ytdl.createAgent([{
            clientName: 'ANDROID',
            clientVersion: '19.14.35',
        }]);

        const streamOptions = {
            agent: agent,
            requestOptions: {
                headers: {
                    'User-Agent': 'com.google.android.youtube/19.14.35 (Linux; U; Android 11; en_US) Max/100'
                }
            }
        };

        const info = await ytdl.getInfo(videoUrlOrId, streamOptions);

        const videoDump = {
            success: true,
            title: info.videoDetails.title,
            // Filter: Sirf wo format jinme url valid hai
            formats: info.formats.filter(f => f.url).map(f => ({
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

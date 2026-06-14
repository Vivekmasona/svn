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
        // Android Client Agent (Sabse stable bypass)
        const agent = ytdl.createAgent(JSON.parse(JSON.stringify(require('@distube/ytdl-core/lib/client-agents'))));

        const streamOptions = {
            agent: agent,
            requestOptions: {
                headers: {
                    'User-Agent': 'com.google.android.youtube/19.14.35 (Linux; U; Android 11; en_US) Max/100',
                    'X-YouTube-Client-Name': '3',
                    'X-YouTube-Client-Version': '19.14.35'
                }
            }
        };

        // Info fetch with agent
        const info = await ytdl.getInfo(videoUrlOrId, streamOptions);

        const videoDump = {
            success: true,
            title: info.videoDetails.title,
            // Sirf wahi format filter kiye jinke paas URL hai
            formats: info.formats
                .filter(f => f.url) 
                .map(f => ({
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


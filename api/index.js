const express = require('express');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const app = express();

app.use(express.json());

// Cache directory for Render (writable /tmp)
process.env.YTDL_CACHE_DIR = path.join('/tmp', 'ytdl-cache');

app.get('/video-info', async (req, res) => {
    // ... wahi purana logic ...
    const videoUrlOrId = req.query.url || req.query.id;
    if (!videoUrlOrId) return res.status(400).json({ error: "Provide url/id" });

    try {
        const agent = ytdl.createAgent([{ clientName: 'ANDROID', clientVersion: '19.14.35' }]);
        const info = await ytdl.getInfo(videoUrlOrId, { agent });

        res.json({
            success: true,
            title: info.videoDetails.title,
            formats: info.formats.filter(f => f.url).map(f => ({
                quality: f.qualityLabel || f.audioQuality,
                url: f.url
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// RENDER KE LIYE ZAROORI: Port bind karna
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

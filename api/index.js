const express = require('express');
const { ytDL } = require('yt-dlp-exec');
const app = express();

app.get('/video-info', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).json({ error: "ID chahiye" });

    try {
        // -j ka matlab hai 'dump-json', ye saare formats aur details dedega
        const data = await ytDL(`https://www.youtube.com/watch?v=${videoId}`, {
            dumpSingleJson: true,
            noCheckCertificates: true
        });
        
        res.json({
            success: true,
            title: data.title,
            formats: data.formats.map(f => ({
                url: f.url,
                format: f.format
            }))
        });
    } catch (e) {
        res.status(500).json({ error: "yt-dlp failed", details: e.message });
    }
});

app.listen(3000);

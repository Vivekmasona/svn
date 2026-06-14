const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    const youtubeUrl = req.query.url;
    res.setHeader('Content-Type', 'application/json');

    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        let videoId = '';
        if (youtubeUrl.includes('youtu.be/')) {
            videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
        } else if (youtubeUrl.includes('v=')) {
            videoId = youtubeUrl.split('v=')[1].split('&')[0];
        } else {
            videoId = youtubeUrl;
        }

        // Ek automatic open engine jo public infrastructure par bina Cloudflare ke chalti hai
        const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}`);
        const html = response.data.contents;

        // YouTube ke adaptiveFormats (audio) ko raw HTML se extract karne ki koshish
        const regex = /"adaptiveFormats":\s*(\[.+?\])/;
        const match = html.match(regex);

        if (match && match[1]) {
            const formats = JSON.parse(match[1]);
            // Sirf audio formats nikalna (audio/mp4 ya audio/webm)
            const audioFormats = formats.filter(f => f.mimeType && f.mimeType.startsWith('audio/'));
            
            if (audioFormats.length > 0) {
                // Sabse pehla high quality stream URL pakdein
                const directUrl = audioFormats[0].url;
                return res.redirect(directUrl);
            }
        }

        // Agar automatic extraction fail ho toh ek external backup open stream proxy pr bhej do
        return res.redirect(`https://youtube-hls-proxy.vercel.app/api/stream/${videoId}`);

    } catch (error) {
        console.error("Bypass Error:", error.message);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to process stream due to network block.",
            details: error.message
        });
    }
});

module.exports = app;

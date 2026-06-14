const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    const youtubeUrl = req.query.url;

    // Response hamesha JSON format mein rahega errors ke liye
    res.setHeader('Content-Type', 'application/json');

    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        // 1. YouTube URL se Video ID nikalna
        let videoId = '';
        if (youtubeUrl.includes('youtu.be/')) {
            videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
        } else if (youtubeUrl.includes('v=')) {
            videoId = youtubeUrl.split('v=')[1].split('&')[0];
        } else {
            videoId = youtubeUrl;
        }

        // 2. Ek ekdum stable free global stream fetcher ko hit karenge
        // Ye bina kisi API key ya rate limit ke directly link return karta hai
        const response = await axios.get(`https://downloader.moe/api/v1/info/${videoId}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;

        // 3. Audio formats dhoondhein
        if (data && data.formats) {
            // Sirf audio format ko filter karein (audio/mp4 ya audio/webm)
            const audioFormats = data.formats.filter(f => f.mimeType && f.mimeType.includes('audio/'));
            
            if (audioFormats.length > 0) {
                // Sabse best quality audio url pakdein
                const streamUrl = audioFormats[0].url;
                
                // DIRECT PLAY: Browser ko seedhe Google ke streaming player par bhej do
                return res.redirect(streamUrl);
            }
        }

        return res.status(404).json({
            error: "Audio format not found in the stable stream engine.",
            api_response: data
        });

    } catch (error) {
        console.error("Stream Engine Error:", error.message);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to fetch direct audio stream.",
            details: error.response ? error.response.data : error.message
        });
    }
});

module.exports = app;

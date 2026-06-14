const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    // Response headers hamesha JSON ke liye set karein
    res.setHeader('Content-Type', 'application/json');

    try {
        let youtubeUrl = req.query.url;

        if (!youtubeUrl) {
            return res.status(400).json({ error: "Please provide a 'url' query parameter." });
        }

        // 1. Safe Video ID Extraction (Taaki crash na ho)
        let videoId = '';
        try {
            if (youtubeUrl.includes('youtu.be/')) {
                videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
            } else if (youtubeUrl.includes('v=')) {
                videoId = youtubeUrl.split('v=')[1].split('&')[0];
            } else {
                videoId = youtubeUrl; // Agar direct ID daali ho
            }
        } catch (urlError) {
            return res.status(400).json({ error: "Invalid YouTube URL format." });
        }

        if (!videoId) {
            return res.status(400).json({ error: "Could not extract Video ID from the provided URL." });
        }

        // 2. API Options
        const options = {
            method: 'GET',
            url: 'https://youtube-video-and-shorts-downloader1.p.rapidapi.com/youtube/v3/video/details',
            params: {
                videoId: videoId,
                urlAccess: 'proxied',
                renderableFormats: '720p,highres',
                getTranscript: 'false'
            },
            headers: {
                'x-rapidapi-key': '650590bd0fmshcf4139ece6a3f8ep145d16jsn955dc4e5fc9a',
                'x-rapidapi-host': 'youtube-video-and-shorts-downloader1.p.rapidapi.com',
                'Content-Type': 'application/json'
            }
        };

        // 3. API Request with Axios
        const response = await axios.request(options);
        
        // Response send karein
        return res.status(200).json({
            status: "Success",
            video_id: videoId,
            api_data: response.data
        });

    } catch (error) {
        // Kisi bhi tareeqay ka error aane par server crash nahi hoga, ye response bhej dega
        console.error("Vercel Function Error: ", error.message);
        
        return res.status(error.response ? error.response.status : 500).json({
            status: "Error",
            message: error.message,
            api_details: error.response ? error.response.data : "No external details available"
        });
    }
});

module.exports = app;

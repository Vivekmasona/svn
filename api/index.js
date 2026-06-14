const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    try {
        let youtubeUrl = req.query.url;

        if (!youtubeUrl) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(400).json({ error: "Please provide a 'url' query parameter." });
        }

        // 1. Video ID extract karein
        let videoId = '';
        if (youtubeUrl.includes('youtu.be/')) {
            videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
        } else if (youtubeUrl.includes('v=')) {
            videoId = youtubeUrl.split('v=')[1].split('&')[0];
        } else {
            videoId = youtubeUrl;
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

        // 3. API Request
        const response = await axios.request(options);
        const apiData = response.data;

        // 4. AUDIO FILE LOGIC: JSON data ke andar se audio link dundhna
        if (apiData && apiData.contents && apiData.contents.contents) {
            const formats = apiData.contents.contents;
            
            // Sabhi formats mein se aisa format dhoondho jisme sirf audio ho (video na ho)
            // Ya fir jiska mimeType audio se start hota ho
            const audioFormat = formats.find(f => f.mimeType && f.mimeType.startsWith('audio/'));

            if (audioFormat && audioFormat.url) {
                // AGAR DIRECT BROWSER ME PLAY/REDIRECT KARNA HAI:
                return res.redirect(audioFormat.url);
            }
        }

        // Agar audio link nahi mila toh backup mein pura data dikha do checking ke liye
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({
            error: "Direct Audio URL not found in API response.",
            api_data: apiData
        });

    } catch (error) {
        console.error(error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

module.exports = app;

const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    let youtubeUrl = req.query.url;

    // Response format hamesha JSON rahega
    res.setHeader('Content-Type', 'application/json');

    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        // 1. YouTube URL se Video ID nikalna (e.g., eOeTkxolrnM)
        let videoId = '';
        if (youtubeUrl.includes('youtu.be/')) {
            videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
        } else if (youtubeUrl.includes('v=')) {
            videoId = youtubeUrl.split('v=')[1].split('&')[0];
        } else {
            videoId = youtubeUrl; // Agar user ne direct ID hi pass kar di ho
        }

        // 2. Naye API ke liye options configure karein
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

        // 3. API Call karein
        const response = await axios.request(options);
        const data = response.data;

        // 4. Sahi data user ko return karein
        return res.status(200).json({
            status: "Success",
            message: "Data fetched successfully from new API",
            video_id: videoId,
            // Is naye API ka jo bhi raw response hoga wo poora yahan dikhega
            api_data: data 
        });

    }
    

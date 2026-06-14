const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    let youtubeUrl = req.query.url;

    // Response hamesha JSON format mein rahega
    res.setHeader('Content-Type', 'application/json');

    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        const options = {
            method: 'GET',
            url: 'https://youtube-info-download-api.p.rapidapi.com/ajax/download.php',
            params: {
                format: 'mp3',
                add_info: '0',
                url: youtubeUrl,
                audio_quality: '249',
                allow_extended_duration: 'true',
                no_merge: 'false',
                audio_language: 'en'
            },
            headers: {
                'x-rapidapi-key': '650590bd0fmshcf4139ece6a3f8ep145d16jsn955dc4e5fc9a',
                'x-rapidapi-host': 'youtube-info-download-api.p.rapidapi.com',
                'Content-Type': 'application/json'
            }
        };

        const response = await axios.request(options);
        const data = response.data;

        // Ab hum binary file download nahi karwayenge, seedhe response ka data screen par show karenge
        if (data.success) {
            return res.status(200).json({
                status: "Success",
                message: "API responded successfully",
                video_title: data.title || (data.info && data.info.title) || "Unknown Title",
                thumbnail: data.thumbnail_url || (data.info && data.info.thumbnail_url) || null,
                // Agar content ready hai toh uski length dikhayega, nahi toh null
                has_content: !!data.content,
                content_length: data.content ? data.content.length : 0,
                progress_url: data.progress_url || null,
                // Agar aapko raw content string dekhni hai toh is niche wali line ko uncomment kar sakte hain:
                // raw_content: data.content || null
            });
        } else {
            return res.status(400).json({
                status: "Failed",
                message: "API failed to process this video link.",
                api_response: data
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            status: "Error",
            error: "Internal Server Error", 
            message: error.message 
        });
    }
});

module.exports = app;

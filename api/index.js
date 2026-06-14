const express = require('express');
const axios = require('axios');
const app = express();

app.get('/play', async (req, res) => {
    const youtubeUrl = req.query.url;

    // 1. Validation: Check agar URL query mein pass kiya hai ya nahi
    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        // 2. RapidAPI Setup
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
                // APNI REAL KEY SE REPLACE KAREIN (Best practice: use process.env.RAPIDAPI_KEY)
                'x-rapidapi-key': '650590bd0fmshcf4139ece6a3f8ep145d16jsn955dc4e5fc9a',
                'x-rapidapi-host': 'youtube-info-download-api.p.rapidapi.com',
                'Content-Type': 'application/json'
            }
        };

        // 3. Call the API
        const response = await axios.request(options);
        const data = response.data;

        // 4. Response handle karein
        if (data.success && data.content) {
            // Base64 string ko Buffer (binary) mein convert karein
            const audioBuffer = Buffer.from(data.content, 'base64');

            // Browser ko batayein ki ye ek audio MP3 file hai
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');

            // Binary data stream send karein
            return res.send(audioBuffer);
        } else if (data.progress_url) {
            // Agar file turant ready nahi hui aur backend par process ho rahi hai
            return res.status(202).json({
                message: "Audio is processing on backend. Please retry in a few seconds.",
                progress_url: data.progress_url
            });
        } else {
            return res.status(500).json({ error: "Failed to fetch content from API.", details: data });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

// Vercel ke liye export karna zaroori hai
module.exports = app;

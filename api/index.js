const express = require('express');
const axios = require('axios');
const app = express();

// Helper function: Jo th thodi der wait karne mein madad karega
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/play', async (req, res) => {
    let youtubeUrl = req.query.url;

    if (!youtubeUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        // Initial API Call
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

        let response = await axios.request(options);
        let data = response.data;

        // POLLING LOGIC: Agar content nahi mila aur progress_url mili hai, toh loop chalao
        let attempts = 0;
        const maxAttempts = 10; // Max 10 baar try karega (approx 20-30 seconds)

        while ((!data.content || data.success === false) && data.progress_url && attempts < maxAttempts) {
            console.log(`Audio is processing... Attempt ${attempts + 1}`);
            
            // 3 second ka wait karein taaki server par load na pade
            await delay(3000); 
            
            // Us progress_url par request bhejein status check karne ke liye
            const progressResponse = await axios.get(data.progress_url, {
                headers: {
                    'x-rapidapi-key': options.headers['x-rapidapi-key'],
                    'x-rapidapi-host': options.headers['x-rapidapi-host']
                }
            });
            
            data = progressResponse.data;
            attempts++;
        }

        // Final Check: Agar loop ke baad data.content mil gaya
        if (data.success && data.content) {
            const audioBuffer = Buffer.from(data.content, 'base64');

            // Set Headers for proper MP3 Download
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
            res.setHeader('Content-Length', audioBuffer.length); // File size batane ke liye

            return res.send(audioBuffer);
        } else {
            // Agar fir bhi ready nahi hua toh error return karein, kharab file nahi!
            res.setHeader('Content-Type', 'application/json');
            return res.status(500).json({
                error: "Timeout or Processing Failed",
                message: "Server took too long to convert this video. Please try again.",
                api_response: data
            });
        }

    } catch (error) {
        console.error(error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

module.exports = app;


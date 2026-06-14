const express = require('express');
const ytdl = require('@distube/ytdl-core');
const app = express();

app.use(express.json());

// MAIN ROUTE: Direct YouTube Video Link/ID se JSON Dump nikalna
app.get('/video-info', async (req, res) => {
    // Aap poora URL (?url=https://www.youtube.com/watch?v=...) ya sirf ID (?id=...) de sakte hain
    const videoUrlOrId = req.query.url || req.query.id;
    res.setHeader('Content-Type', 'application/json');

    if (!videoUrlOrId) {
        return res.status(400).json({ 
            success: false, 
            error: "Please provide a YouTube 'url' or 'id' parameter." 
        });
    }

    try {
        // Mobile Web headers bypass bina cookie ke data nikalne ke liye
        const streamOptions = {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'X-Youtube-Client-Name': '2',
                    'X-Youtube-Client-Version': '2.20240308.00.00'
                }
            }
        };

        // Pure in-memory video info fetch (No disk file writing!)
        const info = await ytdl.getInfo(videoUrlOrId, streamOptions);

        // Ekदम saaf aur clean dump data taiyar karna
        const videoDump = {
            success: true,
            videoDetails: {
                id: info.videoDetails.videoId,
                title: info.videoDetails.title,
                description: info.videoDetails.shortDescription,
                lengthSeconds: info.videoDetails.lengthSeconds,
                viewCount: info.videoDetails.viewCount,
                author: {
                    name: info.videoDetails.author.name,
                    user: info.videoDetails.author.user,
                    channel_url: info.videoDetails.author.channel_url,
                    thumbnails: info.videoDetails.author.thumbnails
                },
                thumbnails: info.videoDetails.thumbnails
            },
            // Saare direct googlevideo.com formats (Audio + Video alag alag)
            formats: info.formats.map(format => ({
                itag: format.itag,
                url: format.url, // Yahi hai direct Google Video streaming playback link!
                mimeType: format.mimeType,
                quality: format.quality || format.qualityLabel,
                audioBitrate: format.audioBitrate,
                hasVideo: format.hasVideo,
                hasAudio: format.hasAudio,
                container: format.container
            }))
        };

        // Pure JSON Dump browser me print kar do
        return res.status(200).json(videoDump);

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch video info dump", 
            details: error.message 
        });
    }
});

module.exports = app;

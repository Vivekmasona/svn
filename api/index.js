const express = require('express');
const ytSearch = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const app = express();

app.use(express.json());

// MAIN ROUTE: Play Route using Native Mobile Client Simulation
app.get('/play', async (req, res) => {
    const songQuery = req.query.query;

    if (!songQuery) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        // 1. YouTube Search
        const searchResults = await ytSearch(songQuery);
        const videos = searchResults.videos;

        if (!videos || videos.length === 0) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: "No songs found on YouTube." });
        }

        // Top original video link
        const videoUrl = videos[0].url;

        // 2. Mobile App Format Options (Bina Cookie ke bypass karne ke liye)
        const streamOptions = {
            filter: 'audioonly',
            quality: 'highestaudio',
            requestOptions: {
                headers: {
                    // Mobile app ka user agent aur headers simulation
                    'User-Agent': 'com.google.android.youtube/19.07.32 (Linux; U; Android 11; en_US) Max/100',
                    'X-YouTube-Client-Name': '3', // Android native client id
                    'X-YouTube-Client-Version': '19.07.32'
                }
            },
            // YouTube ka player client override (Android native format download proxy)
            playerClients: ['ANDROID_VR', 'YTMUSIC'] 
        };

        // 3. Audio format ka info nikalna
        const info = await ytdl.getInfo(videoUrl, streamOptions);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        
        // Sabse best direct stream url nikalna (jo direct streaming url format ho)
        const directAudioUrl = audioFormats[0]?.url;

        if (directAudioUrl) {
            // DIRECT REDIRECT: Seedhe bina cookie ke working link par redirect karo
            return res.redirect(directAudioUrl);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Could not bypass stream encryption." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "YouTube Engine failed", details: error.message });
    }
});

// ROUTE 2: Search Metadata
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');
    if (!songQuery) return res.status(400).json({ error: "Please provide a 'query' parameter." });

    try {
        const searchResults = await ytSearch(songQuery);
        const results = searchResults.videos.slice(0, 10).map(v => ({
            id: v.videoId,
            title: v.title,
            duration: v.timestamp,
            image: v.thumbnail,
            artist: v.author.name,
            stream_url: `https://${req.get('host')}/play?query=${encodeURIComponent(v.title)}`
        }));
        return res.status(200).json({ success: true, results });
    } catch (error) {
        return res.status(500).json({ error: "Search failed", details: error.message });
    }
});

module.exports = app;


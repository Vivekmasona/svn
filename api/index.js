const express = require('express');
const ytSearch = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const app = express();

app.use(express.json());

// ROUTE 1: Direct Search and Play (Vercel Fixed)
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

        const videoUrl = videos[0].url;

        // VERCEL EROFS FIX: Debugging aur client files ko serverless writeable '/tmp' directory me redirect kiya
        const streamOptions = {
            filter: 'audioonly',
            quality: 'highestaudio',
            requestOptions: {
                headers: {
                    'User-Agent': 'com.google.android.youtube/19.07.32 (Linux; U; Android 11; en_US) Max/100',
                    'X-YouTube-Client-Name': '3',
                    'X-YouTube-Client-Version': '19.07.32'
                }
            },
            playerClients: ['ANDROID_VR', 'YTMUSIC'],
            // Agar ytdl file banana chahe toh error na aaye, temporary path override
            options: {
                fileCacheDir: path.join('/tmp') 
            }
        };

        // 2. Audio format nikalna
        const info = await ytdl.getInfo(videoUrl, streamOptions);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        const directAudioUrl = audioFormats[0]?.url;

        if (directAudioUrl) {
            // DIRECT REDIRECT: Bina read-only crash hue direct play
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

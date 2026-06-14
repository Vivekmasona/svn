const express = require('express');
const ytSearch = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const app = express();

app.use(express.json());

// MAIN ROUTE: Pure ytdl bypass route
app.get('/play', async (req, res) => {
    const songQuery = req.query.query;

    if (!songQuery) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        // 1. YouTube Search to get Video URL
        const searchResults = await ytSearch(songQuery);
        const videos = searchResults.videos;

        if (!videos || videos.length === 0) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: "No songs found on YouTube." });
        }

        const videoUrl = videos[0].url;

        // 2. Hardcoded Mobile Client Configs (Bina Cookie ke Data Fetch karne ke liye)
        const streamOptions = {
            filter: 'audioonly',
            quality: 'highestaudio',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'X-Youtube-Client-Name': '2', // WEB_REMIX / MWEB Client proxy
                    'X-Youtube-Client-Version': '2.20240308.00.00'
                }
            }
        };

        // 3. Fetch Video Info (Bina disk par koi file write kiye)
        const info = await ytdl.getInfo(videoUrl, streamOptions);
        
        // 4. Googlevideo Audio Stream URL filter karna
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        
        // Sabse best playable audio url nikalna
        const directGoogleVideoUrl = audioFormats[0]?.url;

        if (directGoogleVideoUrl) {
            // DIRECT REDIRECT: Yeh direct googlevideo.com ka link hoga jo browser me play ho jayega
            return res.redirect(directGoogleVideoUrl);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Could not extract direct googlevideo stream URL." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        // Agar fir bhi koi internal issue aaye toh use crash na karke properly json format me handle kiya
        return res.status(500).json({ 
            error: "ytdl Engine failed", 
            details: error.message 
        });
    }
});

// ROUTE 2: Search Metadata Backup
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

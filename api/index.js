const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ROUTE 1: Wynk Music Search
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');

    if (!songQuery) {
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        // Wynk Music ka official web endpoint search ke liye
        const response = await axios.get(`https://search.wynk.in/v1/search`, {
            params: {
                q: songQuery,
                count: 10,
                offset: 0,
                type: 'SONG'
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;

        if (data && data.items && data.items.length > 0) {
            const results = data.items.map(song => {
                const playUrl = `https://${req.get('host')}/play?id=${song.id}`;
                
                return {
                    id: song.id,
                    title: song.title,
                    album: song.albumName || 'Single',
                    image: song.thumbnail || song.largeImage,
                    artist: song.singers ? song.singers.join(', ') : 'Unknown Artist',
                    stream_url: playUrl
                };
            });

            return res.status(200).json({ success: true, results });
        }

        return res.status(404).json({ success: false, message: "No songs found on Wynk." });

    } catch (error) {
        return res.status(500).json({ error: "Wynk Search failed", details: error.message });
    }
});

// ROUTE 2: Wynk Direct Streaming Route
app.get('/play', async (req, res) => {
    const songId = req.query.id;

    if (!songId) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a song 'id' parameter." });
    }

    try {
        // Wynk ke stream backend se token aur high quality raw url nikalna
        const response = await axios.get(`https://content.wynk.in/v1/content/song/${songId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const songData = response.data;

        // Wynk response me streamUrl direct ya fir alternate media paths me deta hai
        let directStream = songData.streamUrl || (songData.mediaUrls && songData.mediaUrls.high);

        if (directStream) {
            // DIRECT PLAY: Kisi third party wrapper ki need nahi, browser sidhe audio play karega
            return res.redirect(directStream);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Audio stream link not available for this song id." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Wynk Playback extraction failed", details: error.message });
    }
});

module.exports = app;

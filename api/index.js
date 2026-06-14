const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ROUTE 1: Gaana Search Karne Ke Liye (Fixed Stream URL)
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');

    if (!songQuery) {
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMeta=1&query=${encodeURIComponent(songQuery)}`);
        const data = response.data;
        
        if (data && data.songs && data.songs.data.length > 0) {
            const results = data.songs.data.map(song => {
                // Ab hum perma_url ke jhanjhat me nahi padenge, direct ID bhejenge play route ko
                const playUrl = `https://${req.get('host')}/play?id=${song.id}`;
                
                return {
                    id: song.id,
                    title: song.title.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
                    album: song.album.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
                    image: song.image.replace('50x50', '500x500'), // Album Art High Quality
                    artist: song.more_info.music || song.description,
                    stream_url: playUrl
                };
            });

            return res.status(200).json({ success: true, results });
        }

        return res.status(404).json({ success: false, message: "No songs found for this query." });

    } catch (error) {
        return res.status(500).json({ error: "Search failed", details: error.message });
    }
});

// ROUTE 2: Direct Song ID Se Play/Redirect Karne Ke Liye (Fixed & Super Stable)
app.get('/play', async (req, res) => {
    const songId = req.query.id;

    if (!songId) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a song 'id' parameter (e.g. /play?id=YiVML4Zo)." });
    }

    try {
        // ID se details nikalne ki official web API call
        const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=webapi.get&pids=${songId}&type=song&_format=json&_marker=0&api_version=4&ctx=web6dot0`);
        const songData = response.data;
        
        if (songData && songData[songId] && songData[songId].media_urls) {
            // Best Quality Audio select karein (320kbps ya fir aur koi working preview)
            const directAudio = songData[songId].media_urls.hifi_320 || 
                                songData[songId].media_urls.premium_320 || 
                                songData[songId].media_urls.preview;
            
            if (directAudio) {
                // DIRECT PLAY: Browser seedhe audio play karne lagega
                return res.redirect(directAudio);
            }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Direct stream link not found for this Song ID." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Playback extraction failed", details: error.message });
    }
});

module.exports = app;


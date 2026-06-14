
const express = require('express');
const axios = require('axios');
const app = express();

// JSON response by default
app.use(express.json());

// ROUTE 1: Gaana Search Karne Ke Liye
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');

    if (!songQuery) {
        return res.status(400).json({ error: "Please provide a 'query' parameter (e.g. /search?query=tum hi ho)" });
    }

    try {
        // Saavn ke internal open API endpoint ko hit karenge (No Key Required)
        const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMeta=1&query=${encodeURIComponent(songQuery)}`);
        
        const data = response.data;
        
        if (data && data.songs && data.songs.data.length > 0) {
            const results = data.songs.data.map(song => {
                // High quality 320kbps audio URL ke liye token formats
                // JioSaavn ke cdn urls bina kisi proxy restriction ke browser me direct play hote hain
                let mediaUrl = song.media_url || '';
                if (mediaUrl) {
                    mediaUrl = mediaUrl.replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4');
                }
                
                return {
                    id: song.id,
                    title: song.title.replace(/&quot;/g, '"'),
                    album: song.album,
                    image: song.image.replace('150x150', '500x500'), // High Quality Image
                    artist: song.more_info.music || song.description,
                    stream_url: mediaUrl || `https://svn-three.vercel.app/play?url=${encodeURIComponent(song.perma_url)}`
                };
            });

            return res.status(200).json({ success: true, results });
        }

        return res.status(404).json({ success: false, message: "No songs found for this query." });

    } catch (error) {
        return res.status(500).json({ error: "Search failed", details: error.message });
    }
});

// ROUTE 2: Direct URL Se Play/Redirect Karne Ke Liye
app.get('/play', async (req, res) => {
    const songUrl = req.query.url;

    if (!songUrl) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a JioSaavn song 'url' parameter." });
    }

    try {
        // Gaane ki permalink se direct streaming link nikalna
        const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=webapi.get&token=${songUrl.split('/song/')[1].split('/')[1]}&type=song&_format=json&_marker=0&api_version=4&ctx=web6dot0`);
        
        const songData = response.data;
        const songId = Object.keys(songData)[0];
        
        if (songData[songId] && songData[songId].media_urls) {
            // Best quality 320kbps ya 160kbps select karein
            const directAudio = songData[songId].media_urls.hifi_320 || songData[songId].media_urls.preview;
            
            // DIRECT PLAY: Browser ko seedhe .mp4/.mp3 download link pr bhej do, player bina rukaawat ke play karega
            return res.redirect(directAudio);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Direct stream link not found for this URL." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Playback extraction failed", details: error.message });
    }
});

module.exports = app;

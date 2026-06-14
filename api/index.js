const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ROUTE 1: Search Route
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');

    if (!songQuery) {
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        // Saavn Dev API search wrapper ka use karenge jo hamesha free aur up-to-date rehta hai
        const response = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(songQuery)}`);
        const data = response.data;

        if (data && data.success && data.data && data.data.results.length > 0) {
            const results = data.data.results.map(song => {
                const playUrl = `https://${req.get('host')}/play?id=${song.id}`;
                
                // Artist name arrays se string banana
                const artistName = song.artists && song.artists.primary && song.artists.primary.length > 0 
                    ? song.artists.primary.map(a => a.name).join(', ') 
                    : 'Unknown Artist';

                // Best quality image nikalna 
                const imageUrl = song.image && song.image.length > 0 ? song.image[song.image.length - 1].url : '';

                return {
                    id: song.id,
                    title: song.name,
                    album: song.album ? song.album.name : 'Single',
                    image: imageUrl,
                    artist: artistName,
                    stream_url: playUrl
                };
            });

            return res.status(200).json({ success: true, results });
        }

        return res.status(404).json({ success: false, message: "No songs found." });

    } catch (error) {
        console.error("Search Error:", error.message);
        return res.status(500).json({ error: "Search failed", details: error.message });
    }
});

// ROUTE 2: Play/Redirect Route (Bypassed & Decrypted)
app.get('/play', async (req, res) => {
    const songId = req.query.id;

    if (!songId) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a song 'id' parameter." });
    }

    try {
        // Direct Song ID se detailed info fetch karna jisme decrypted download links hote hain
        const response = await axios.get(`https://saavn.dev/api/songs/${songId}`);
        const data = response.data;

        if (data && data.success && data.data && data.data.length > 0) {
            const songObj = data.data[0];
            
            // downloadUrl array me alag-alag qualities hoti hain (96kbps se lekar 320kbps tak)
            // Hum array ka aakhri element (sabse high quality 320kbps) select karenge
            if (songObj.downloadUrl && songObj.downloadUrl.length > 0) {
                const directAudioUrl = songObj.downloadUrl[songObj.downloadUrl.length - 1].url;
                
                // DIRECT PLAY: Browser ko seedhe gaane ke download/stream link pr bhej do
                return res.redirect(directAudioUrl);
            }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Direct stream link could not be decrypted for this Song ID." });

    } catch (error) {
        console.error("Playback Error:", error.message);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Playback extraction failed", details: error.message });
    }
});

module.exports = app;

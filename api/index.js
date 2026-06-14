const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// SoundCloud Public Client ID
const CLIENT_ID = '95f793159e1e1d23472d4b9f298642ca';

// ROUTE 1: SoundCloud Search (Simplified with ID)
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');

    if (!songQuery) {
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        const response = await axios.get(`https://api-v2.soundcloud.com/search/tracks`, {
            params: {
                q: songQuery,
                client_id: CLIENT_ID,
                limit: 10
            }
        });

        const data = response.data;

        if (data && data.collection && data.collection.length > 0) {
            const results = data.collection.map(track => {
                // Ab hum query me track_url nahi, seedhe Track ID bhejenge
                const playUrl = `https://${req.get('host')}/play?id=${track.id}`;
                
                return {
                    id: track.id,
                    title: track.title,
                    album: track.publisher_metadata?.album_title || "Single",
                    image: track.artwork_url ? track.artwork_url.replace('large', 't500x500') : 'https://soundcloud.com/favicon.ico',
                    artist: track.user?.username || "Unknown Artist",
                    stream_url: playUrl
                };
            });

            return res.status(200).json({ success: true, results });
        }

        return res.status(404).json({ success: false, message: "No songs found on SoundCloud." });

    } catch (error) {
        return res.status(500).json({ error: "SoundCloud Search failed", details: error.message });
    }
});

// ROUTE 2: SoundCloud Play (Direct Track ID Streaming)
app.get('/play', async (req, res) => {
    const trackId = req.query.id;

    if (!trackId) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a track 'id' parameter (e.g. /play?id=TRACK_ID)." });
    }

    try {
        // Direct track ID se stream link fetch karna
        const trackResponse = await axios.get(`https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${CLIENT_ID}`);
        const trackData = trackResponse.data;
        
        // Progressive (.mp3) format nikalna
        const progressiveTranscoding = trackData.media?.transcodings?.find(
            t => t.format.protocol === 'progressive'
        );

        if (progressiveTranscoding && progressiveTranscoding.url) {
            const streamAuthResponse = await axios.get(`${progressiveTranscoding.url}?client_id=${CLIENT_ID}`);
            
            if (streamAuthResponse.data && streamAuthResponse.data.url) {
                // DIRECT PLAY: Seedhe mp3 stream par redirect
                return res.redirect(streamAuthResponse.data.url);
            }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Direct audio stream link not found for this track ID." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "SoundCloud Playback failed", details: error.message });
    }
});

module.exports = app;

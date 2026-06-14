const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// SoundCloud ki default public Client ID (Yeh streaming aur search ke liye use hoti hai)
const CLIENT_ID = '95f793159e1e1d23472d4b9f298642ca';

// ROUTE 1: SoundCloud Search
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');

    if (!songQuery) {
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        // SoundCloud public tracks search API
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
                const playUrl = `https://${req.get('host')}/play?track_url=${encodeURIComponent(track.permalink_url)}`;
                
                return {
                    id: track.id,
                    title: track.title,
                    album: track.publisher_metadata?.album_title || "Single",
                    image: track.artwork_url ? track.artwork_url.replace('large', 't500x500') : 'https://soundcloud.com/favicon.ico', // High Quality Image
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

// ROUTE 2: SoundCloud Play/Stream Redirect
app.get('/play', async (req, res) => {
    const trackUrl = req.query.track_url;

    if (!trackUrl) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a 'track_url' parameter." });
    }

    try {
        // 1. Track URL se stream media protocols nikalna
        const resolveResponse = await axios.get(`https://api-v2.soundcloud.com/resolve`, {
            params: {
                url: trackUrl,
                client_id: CLIENT_ID
            }
        });

        const trackData = resolveResponse.data;
        
        // Progressive HTTP stream format dhoondhna (.mp3 link ke liye)
        const progressiveTranscoding = trackData.media?.transcodings?.find(
            t => t.format.protocol === 'progressive'
        );

        if (progressiveTranscoding && progressiveTranscoding.url) {
            // 2. Direct secure mp3 streaming link fetch karna
            const streamAuthResponse = await axios.get(`${progressiveTranscoding.url}?client_id=${CLIENT_ID}`);
            
            if (streamAuthResponse.data && streamAuthResponse.data.url) {
                // DIRECT PLAY: Browser seedhe mp3 track play kar dega bina kisi block ke
                return res.redirect(streamAuthResponse.data.url);
            }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Direct audio stream link not found for this track." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "SoundCloud Playback failed", details: error.message });
    }
});

module.exports = app;

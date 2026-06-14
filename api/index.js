const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ROUTE 1: Direct Google Video Playback URL Link Generator
app.get('/play', async (req, res) => {
    const songQuery = req.query.query;

    if (!songQuery) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        // 1. Internal YouTube Search Fetch (Bina extra library ke)
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}&sp=EgIQAQ%253D%253D`; // Only videos filter
        const searchResponse = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        const html = searchResponse.data;
        const videoIdMatch = html.match(/"videoId":"([^"]+)"/);
        
        if (!videoIdMatch || !videoIdMatch[1]) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: "Song not found on YouTube." });
        }

        const videoId = videoIdMatch[1];

        // 2. YouTube Mobile/TV Client ke sath streaming data payload request
        const playerUrl = 'https://www.youtube.com/api/stats/watchtime?ns=yt&el=detailpage'; // dummy config endpoint or base player endpoint
        
        // Native Android Innertube client config se data hit karna
        const innertubeResponse = await axios.post(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_JVGgS09BI5Y7L5HnSh9A3gE0Wj7V0Y`, {
            videoId: videoId,
            context: {
                client: {
                    clientName: 'ANDROID_TESTSUITE',
                    clientVersion: '1.9.3',
                    platform: 'MOBILE',
                    osName: 'Android'
                }
            }
        });

        const streamingData = innertubeResponse.data?.streamingData;
        
        if (!streamingData || !streamingData.adaptiveFormats) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: "Google Video playback data not found." });
        }

        // 3. Audio streaming formats me se best URL filter karna
        const audioFormats = streamingData.adaptiveFormats.filter(format => 
            format.mimeType && format.mimeType.startsWith('audio/')
        );

        // Subse best bitrate aur playable URL nikalna
        const bestAudioFormat = audioFormats.find(f => f.url) || streamingData.formats.find(f => f.url);

        if (bestAudioFormat && bestAudioFormat.url) {
            // DIRECT REDIRECT: Yeh url seedhe `.googlevideo.com` domain ka hoga!
            return res.redirect(bestAudioFormat.url);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Direct Google Video link is encrypted or restricted." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Google Video playback fetch failed", details: error.message });
    }
});

// ROUTE 2: Simple clean text format output (Agar direct google link sirf text me chahiye ho)
app.get('/get-link', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');
    if (!songQuery) return res.status(400).json({ error: "Please provide a 'query' parameter." });

    try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}`;
        const searchResponse = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const videoId = searchResponse.data.match(/"videoId":"([^"]+)"/)?.[1];

        if (!videoId) return res.status(404).json({ error: "Video not found" });

        const innertube = await axios.post(`https://www.youtube.com/youtubei/v1/player`, {
            videoId: videoId,
            context: { client: { clientName: 'ANDROID_TESTSUITE', clientVersion: '1.9.3' } }
        });

        const url = innertube.data?.streamingData?.adaptiveFormats?.find(f => f.url)?.url;
        if (url) return res.status(200).json({ success: true, googlevideo_url: url });
        
        return res.status(404).json({ error: "Link stream missing" });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

module.exports = app;

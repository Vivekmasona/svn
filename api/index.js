const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Function: Jo SoundCloud ke live script se fresh client_id dhoondh ke nikalega
async function getFreshClientId() {
    try {
        const homeResponse = await axios.get('https://soundcloud.com', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = homeResponse.data;
        
        const scriptRegex = /src="([^"]+\/assets\/[^"]+\.js)"/g;
        let match;
        const scripts = [];
        while ((match = scriptRegex.exec(html)) !== null) {
            scripts.push(match[1]);
        }

        for (let scriptUrl of scripts.reverse().slice(0, 3)) {
            const scriptResponse = await axios.get(scriptUrl);
            const idMatch = scriptResponse.data.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/);
            if (idMatch && idMatch[1]) {
                return idMatch[1];
            }
        }
    } catch (e) {
        console.error("ID extraction failed, using fallback");
    }
    return '2t9mqaC7aZrr6v6scvW6Y06Z7v0K8A1Z'; 
}

// SINGLE MAIN ROUTE: Search and Direct Play (No JSON output!)
app.get('/play', async (req, res) => {
    // Aap query parameter (?query=...) ya fir purana track id (?id=...) dono use kar sakte hain
    const songQuery = req.query.query;
    const trackId = req.query.id;

    try {
        const dynamicId = await getFreshClientId();
        let targetTrack = null;

        // CASE 1: Agar gaane ka naam (query) diya gaya hai
        if (songQuery) {
            const searchResponse = await axios.get(`https://api-v2.soundcloud.com/search/tracks`, {
                params: {
                    q: songQuery,
                    client_id: dynamicId,
                    limit: 5 // Top 5 results nikalenge filter karne ke liye
                }
            });

            const collection = searchResponse.data?.collection;
            if (collection && collection.length > 0) {
                // Pehle koshish karenge ki koi aisa track mile jo remix/slowed na ho (Original-like)
                targetTrack = collection.find(track => {
                    const title = track.title.toLowerCase();
                    return !title.includes('slowed') && !title.includes('reverb') && !title.includes('remix');
                }) || collection[0]; // Agar sab lofi/remix hain, toh pehla result utha lo
            }
        } 
        // CASE 2: Agar seedhe track id paas ki gayi ho (purane compatibility ke liye)
        else if (trackId) {
            const trackResponse = await axios.get(`https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${dynamicId}`);
            targetTrack = trackResponse.data;
        } 
        // Agar dono nahi hain toh error
        else {
            res.setHeader('Content-Type', 'application/json');
            return res.status(400).json({ error: "Please provide either a 'query' or an 'id' parameter." });
        }

        // Streaming Link Extraction logic
        if (targetTrack) {
            const progressiveTranscoding = targetTrack.media?.transcodings?.find(
                t => t.format.protocol === 'progressive'
            );

            if (progressiveTranscoding && progressiveTranscoding.url) {
                const streamAuthResponse = await axios.get(`${progressiveTranscoding.url}?client_id=${dynamicId}`);
                
                if (streamAuthResponse.data && streamAuthResponse.data.url) {
                    // DIRECT AUDIO REDIRECT: Seedhe gaana chalega, koi json nahi!
                    return res.redirect(streamAuthResponse.data.url);
                }
            }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Audio track could not be fetched or played." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Direct playback failed", details: error.message });
    }
});

// Search route ko backup ke liye choda hai agar kabhi metadata (image/title) chahiye ho
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');
    if (!songQuery) return res.status(400).json({ error: "Please provide a 'query' parameter." });
    try {
        const dynamicId = await getFreshClientId();
        const response = await axios.get(`https://api-v2.soundcloud.com/search/tracks`, { params: { q: songQuery, client_id: dynamicId, limit: 10 } });
        if (response.data?.collection?.length > 0) {
            const results = response.data.collection.map(track => ({
                id: track.id,
                title: track.title,
                album: track.publisher_metadata?.album_title || "Single",
                image: track.artwork_url ? track.artwork_url.replace('large', 't500x500') : 'https://soundcloud.com/favicon.ico',
                artist: track.user?.username || "Unknown Artist",
                stream_url: `https://${req.get('host')}/play?id=${track.id}`
            }));
            return res.status(200).json({ success: true, results });
        }
        return res.status(404).json({ success: false, message: "No songs found." });
    } catch (error) { return res.status(500).json({ error: "Search failed", details: error.message }); }
});

module.exports = app;

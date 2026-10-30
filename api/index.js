const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const DEFAULT_POSTER_URL = "https://i.ibb.co/nqFL3YnZ/1780943911545.png";

// Helper: Decrypt JioSaavn encrypted_media_url to get Full 320kbps MP3 URL
function getFullStreamUrl(encrypted_media_url) {
    if (!encrypted_media_url) return null;
    try {
        const key = Buffer.from('38346591', 'utf-8');
        const decipher = crypto.createDecipheriv('des-ecb', key, null);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(encrypted_media_url, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Upgrade quality to high quality 320kbps MP3
        return decrypted.replace('_96.mp4', '_320.mp3').replace('_160.mp4', '_320.mp3');
    } catch (e) {
        return null;
    }
}

// Helper: High Quality Image
function getHighQualityImage(url) {
    if (!url) return DEFAULT_POSTER_URL;
    return url.replace('150x150', '500x500');
}

// --- 1. Search & List Endpoint: /api/songs?q=hindi (Ya koi bhi query) ---
app.get("/api/songs", async (req, res) => {
    const query = req.query.q || req.query.name;
    if (!query) {
        return res.status(400).json({ error: "Please provide a search query (e.g., /api/songs?q=hindi)" });
    }

    try {
        const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web64&n=10`;
        
        const searchRes = await axios.get(searchUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        let data = searchRes.data;
        if (typeof data === 'string') {
            data = JSON.parse(data.replace(/^\/\*!\s*jquery[\s\S]*?\*\//, '').trim());
        }

        const results = data.results || [];
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "No songs found." });
        }

        // Har gaane ke liye full link generate karke list return karo
        const formattedSongs = results.map(song => {
            const encryptedUrl = song.more_info?.encrypted_media_url;
            const fullStreamUrl = getFullStreamUrl(encryptedUrl);

            return {
                id: song.id,
                title: song.title || "Unknown Title",
                album: song.more_info?.album || "Single",
                artist: song.more_info?.music || song.subtitle || "Unknown Artist",
                poster: getHighQualityImage(song.image),
                duration: song.more_info?.duration ? parseInt(song.more_info.duration) : 0,
                stream: fullStreamUrl // Yeh hai 100% full-length direct MP3 CDN link!
            };
        });

        res.json({
            success: true,
            total: data.total || formattedSongs.length,
            results: formattedSongs
        });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- 2. Single Info Endpoint: /info?name=song_name ---
app.get("/info", async (req, res) => {
    const query = req.query.name || req.query.query;
    if (!query) {
        return res.status(400).json({ error: "Please provide a 'name' parameter" });
    }

    try {
        const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web64&n=1`;
        
        const searchRes = await axios.get(searchUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        let data = searchRes.data;
        if (typeof data === 'string') {
            data = JSON.parse(data.replace(/^\/\*!\s*jquery[\s\S]*?\*\//, '').trim());
        }

        const song = data.results?.[0];
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found." });
        }

        const fullStreamUrl = getFullStreamUrl(song.more_info?.encrypted_media_url);

        res.json({
            success: true,
            title: song.title,
            album: song.more_info?.album || "Single",
            artist: song.more_info?.music || song.subtitle,
            poster: getHighQualityImage(song.image),
            stream: fullStreamUrl
        });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- 3. Direct Play / Redirect Endpoint: /play?name=song_name ---
app.get("/play", async (req, res) => {
    const query = req.query.name || req.query.query;
    if (!query) return res.status(400).json({ error: "Please provide a 'name' parameter." });

    try {
        const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web64&n=1`;
        const searchRes = await axios.get(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        
        let data = searchRes.data;
        if (typeof data === 'string') {
            data = JSON.parse(data.replace(/^\/\*!\s*jquery[\s\S]*?\*\//, '').trim());
        }

        const song = data.results?.[0];
        if (!song) return res.status(404).json({ error: "Song not found" });

        const fullStreamUrl = getFullStreamUrl(song.more_info?.encrypted_media_url);
        if (fullStreamUrl) {
            return res.redirect(fullStreamUrl);
        }

        res.status(404).json({ error: "Stream link not available" });
    } -> catch (e) {
        res.status(500).json({ error: e.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log("Server Running on port " + PORT));
}

module.exports = app;

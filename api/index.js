const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const DEFAULT_POSTER_URL = "https://i.ibb.co/nqFL3YnZ/1780943911545.png";

// Robust Decryption Function for JioSaavn encrypted_media_url
function decryptUrl(encrypted_media_url) {
    if (!encrypted_media_url) return null;
    try {
        let encryptedBuffer = Buffer.from(encrypted_media_url, 'base64');
        const key = Buffer.from('38346591', 'utf-8');
        
        const decipher = crypto.createDecipheriv('des-ecb', key, null);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(encryptedBuffer, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        
        let finalUrl = decrypted.replace('_96.mp4', '_320.mp3').replace('_160.mp4', '_320.mp3');
        if (finalUrl.startsWith('http://')) finalUrl = finalUrl.replace('http://', 'https://');
        return finalUrl;
    } catch (e) {
        try {
            const decipher = crypto.createDecipheriv('des-ecb', Buffer.from('38346591', 'utf-8'), null);
            decipher.setAutoPadding(false);
            let decrypted = decipher.update(encrypted_media_url, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted.replace('_96.mp4', '_320.mp3').replace('_160.mp4', '_320.mp3');
        } catch (err) {
            return null;
        }
    }
}

// Helper: High Quality Image
function getHighQualityImage(url) {
    if (!url) return DEFAULT_POSTER_URL;
    return url.replace('150x150', '500x500');
}

// --- Helper: Fetch Full Song Details By ID (Bypasses JioTune Previews) ---
async function getFullSongDetailsById(songId) {
    try {
        const detailsUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&api_version=4&ctx=web64&pids=${songId}`;
        const res = await axios.get(detailsUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        
        let data = res.data;
        if (typeof data === 'string') {
            data = JSON.parse(data.replace(/^\/\*!\s*jquery[\s\S]*?\*\//, '').trim());
        }

        // Song details object usually comes keyed by its ID or inside songs array/object
        const songData = data[songId] || data.songs?.[0] || Object.values(data)[0];
        if (!songData) return null;

        const encryptedUrl = songData.more_info?.encrypted_media_url;
        let streamUrl = decryptUrl(encryptedUrl);

        // Agar encrypted url se decrypt na ho, toh direct media_url check karo agar available ho
        if (!streamUrl && songData.more_info?.media_url) {
            streamUrl = songData.more_info.media_url.replace('_96.mp4', '_320.mp3').replace('_160.mp4', '_320.mp3');
        }

        return {
            id: songData.id,
            title: songData.title || "Unknown Title",
            album: songData.more_info?.album || "Single",
            artist: songData.more_info?.music || songData.subtitle || "Unknown Artist",
            poster: getHighQualityImage(songData.image),
            duration: songData.more_info?.duration ? parseInt(songData.more_info.duration) : 0,
            stream: streamUrl
        };
    } catch (e) {
        return null;
    }
}

// --- 1. Search & List Endpoint: /api/songs?q=query ---
app.get("/api/songs", async (req, res) => {
    const query = req.query.q || req.query.name;
    if (!query) {
        return res.status(400).json({ error: "Please provide a search query (e.g., /api/songs?q=padmaavat)" });
    }

    try {
        const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web64&n=15`;
        
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

        // Har gaane ke liye uski ID se detail fetch karenge taaki 100% full song link mile
        const formattedSongs = [];
        for (const song of results) {
            if (song.id) {
                const fullSong = await getFullSongDetailsById(song.id);
                if (fullSong && fullSong.stream) {
                    formattedSongs.push(fullSong);
                }
            }
        }

        res.json({
            success: true,
            total: formattedSongs.length,
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
        
        const searchRes = await axios.get(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        let data = searchRes.data;
        if (typeof data === 'string') {
            data = JSON.parse(data.replace(/^\/\*!\s*jquery[\s\S]*?\*\//, '').trim());
        }

        const song = data.results?.[0];
        if (!song || !song.id) {
            return res.status(404).json({ success: false, message: "Song not found." });
        }

        const fullSong = await getFullSongDetailsById(song.id);
        if (!fullSong || !fullSong.stream) {
            return res.status(404).json({ success: false, message: "Full stream link not available." });
        }

        res.json({
            success: true,
            ...fullSong
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
        if (!song || !song.id) return res.status(404).json({ error: "Song not found" });

        const fullSong = await getFullSongDetailsById(song.id);
        if (fullSong && fullSong.stream) {
            return res.redirect(fullSong.stream);
        }

        res.status(404).json({ error: "Stream link not available" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log("Server Running on port " + PORT));
}

module.exports = app;


const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const DEFAULT_POSTER_URL = "https://i.ibb.co/nqFL3YnZ/1780943911545.png";

let CLIENT_ID = null;
let LAST_UPDATE = 0;

// --- Helper: Get Client ID ---
async function getClientId() {
    if (CLIENT_ID && (Date.now() - LAST_UPDATE) < 3600000) return CLIENT_ID;
    try {
        const home = await axios.get("https://soundcloud.com", { headers: { "User-Agent": "Mozilla/5.0" } });
        const html = home.data;
        const files = [...html.matchAll(/src="([^"]+\/assets\/[^"]+\.js)"/g)].map(v => v[1]);
        for (const file of files.reverse().slice(0, 5)) {
            const js = await axios.get(file);
            const match = js.data.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/);
            if (match) {
                CLIENT_ID = match[1];
                LAST_UPDATE = Date.now();
                return CLIENT_ID;
            }
        }
    } catch (e) {}
    CLIENT_ID = "2t9mqaC7aZrr6v6scvW6Y06Z7v0K8A1Z";
    LAST_UPDATE = Date.now();
    return CLIENT_ID;
}

// --- Helper: Get Working Track by Name (With Loop Fallback) ---
async function getWorkingTrack(query) {
    const client_id = await getClientId();
    try {
        const res = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
            params: { q: query, client_id, limit: 10 }
        });
        
        const collection = res.data?.collection || [];
        if (collection.length === 0) return null;

        // Loop to find the first track that has a valid progressive stream
        for (const track of collection) {
            const progressive = track.media?.transcodings?.find(x => x.format.protocol === "progressive");
            if (progressive && progressive.url) {
                try {
                    const auth = await axios.get(progressive.url, { params: { client_id } });
                    if (auth.data?.url) {
                        return { track, streamUrl: auth.data.url };
                    }
                } catch (err) {
                    continue;
                }
            }
        }
    } catch (e) {}
    return null;
}

// --- Info Endpoint: Info (Poster + Title + Stream) ---
app.get("/info", async (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: "name required" });

    try {
        const result = await getWorkingTrack(name);
        if (!result) return res.status(404).json({ message: "Song or playable stream not found" });

        const { track, streamUrl } = result;
        const poster = track.artwork_url ? track.artwork_url.replace("large", "t500x500") : DEFAULT_POSTER_URL;

        res.json({
            success: true,
            title: track.title,
            artist: track.user?.username || "Unknown",
            poster: poster,
            stream: streamUrl,
            download: `/dl?name=${encodeURIComponent(name)}`
        });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- Play Endpoint: play?name=SongName or play?id=TrackID ---
app.get("/play", async (req, res) => {
    const name = req.query.name;
    const id = req.query.id;

    try {
        const client_id = await getClientId();
        let streamUrl = null;

        if (id) {
            const resData = await axios.get(`https://api-v2.soundcloud.com/tracks/${id}`, { params: { client_id } });
            const track = resData.data;
            const progressive = track.media?.transcodings?.find(x => x.format.protocol === "progressive");
            if (progressive) {
                const auth = await axios.get(progressive.url, { params: { client_id } });
                streamUrl = auth.data?.url;
            }
        } else if (name) {
            const result = await getWorkingTrack(name);
            if (result) streamUrl = result.streamUrl;
        } else {
            return res.status(400).json({ error: "name or id required" });
        }

        if (streamUrl) return res.redirect(streamUrl);
        
        res.status(404).json({ message: "No playable stream found" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Download Endpoint: dl?name=SongName ---
app.get("/dl", async (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: "name required" });

    try {
        const result = await getWorkingTrack(name);
        if (!result) return res.status(404).json({ message: "Song or stream not found" });

        const { track, streamUrl } = result;
        const response = await axios({ method: 'get', url: streamUrl, responseType: 'stream' });
        
        const safeName = track.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');
        
        response.data.pipe(res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log("Server running on port " + PORT));
}

module.exports = app;


const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

let CLIENT_ID = null;
let LAST_UPDATE = 0;

// --- Helper: Get Client ID ---
async function getClientId() {
    if (CLIENT_ID && (Date.now() - LAST_UPDATE) < 3600000) {
        return CLIENT_ID;
    }

    try {
        const home = await axios.get("https://soundcloud.com", {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
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

// --- Helper: Clean Title ---
function cleanSongTitle(title) {
    if (!title) return "";
    return title
        .replace(/(\[.*?\]|\(.*?\))/g, "") // Remove brackets
        .replace(/(official|video|lyrics|music|audio|hd|4k|remix|slowed|reverb)/gi, "") // Remove keywords
        .replace(/[^a-zA-Z0-9\s]/g, " ") // Remove special chars
        .replace(/\s+/g, " ") // Clean extra spaces
        .trim()
        .split(" ").slice(0, 5).join(" "); // Keep first 5 words
}

// --- Route: Search by YouTube ID ---
app.get("/search-yt", async (req, res) => {
    const videoId = req.query.videoid;
    if (!videoId) return res.status(400).json({ success: false, message: "videoid required" });

    try {
        const ytRes = await axios.get(`https://vivekmasona-denocall-61.deno.dev/search?q=${videoId}`);
        const cleanTitle = cleanSongTitle(ytRes.data.title);
        
        const client_id = await getClientId();
        const scRes = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
            params: { q: cleanTitle, client_id, limit: 10 }
        });

        res.json({ success: true, cleanTitle, results: scRes.data.collection });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- SEARCH ---
app.get("/search", async (req, res) => {
    const q = req.query.query;
    if (!q) return res.status(400).json({ success: false, message: "query required" });

    try {
        const client_id = await getClientId();
        const r = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
            params: { q, client_id, limit: 10 }
        });

        const list = (r.data.collection || []).map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user?.username || "Unknown",
            image: track.artwork_url ? track.artwork_url.replace("large", "t500x500") : null,
            stream: `/play?id=${track.id}`
        }));

        res.json({ success: true, results: list });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- PLAY ---
app.get("/play", async (req, res) => {
    const { query, id } = req.query;
    try {
        const client_id = await getClientId();
        let tracks = [];

        if (query) {
            const search = await axios.get("https://api-v2.soundcloud.com/search/tracks", { params: { q: query, client_id, limit: 15 } });
            tracks = search.data.collection || [];
        } else if (id) {
            const track = await axios.get(`https://api-v2.soundcloud.com/tracks/${id}`, { params: { client_id } });
            tracks = [track.data];
        } else {
            return res.status(400).json({ error: "query or id required" });
        }

        const blocked = ["slowed", "reverb", "remix", "nightcore", "bootleg", "sped up", "8d"];
        tracks.sort((a, b) => a.title.toLowerCase().includes(blocked) - b.title.toLowerCase().includes(blocked));

        for (const track of tracks) {
            const progressive = track.media?.transcodings?.find(x => x.format.protocol === "progressive");
            if (!progressive) continue;
            try {
                const auth = await axios.get(progressive.url, { params: { client_id } });
                if (auth.data.url) return res.redirect(auth.data.url);
            } catch (e) {}
        }
        res.status(404).json({ success: false, message: "No playable stream found" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port " + PORT));

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Helper function: Encrypted media URL ko decrypt karne ka official algorithm
function decryptUrl(encryptedUrl) {
    if (!encryptedUrl) return '';
    try {
        // JioSaavn ka standard public DES decryption binary logic
        const crypto = require('crypto');
        const key = '38346a3435323231'; // Official Saavn Secret Key
        const decipher = crypto.createDecipheriv('des-ecb', key, '');
        decipher.setAutoPadding(true);
        let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Link ko clean aur stream-ready banana
        return decrypted.replace(/_96\.mp4/_320\.mp4/g).replace(/_160\.mp4/_320\.mp4/g);
    } catch (e) {
        // Agar decryption fail ho to purana format return karein
        return encryptedUrl.replace('_96.mp4', '_320.mp4');
    }
}

// ROUTE 1: Official JioSaavn Search
app.get('/search', async (req, res) => {
    const songQuery = req.query.query;
    res.setHeader('Content-Type', 'application/json');

    if (!songQuery) {
        return res.status(400).json({ error: "Please provide a 'query' parameter." });
    }

    try {
        // Direct JioSaavn.com official API endpoint (Yeh hamesha live rehta hai)
        const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMeta=1&query=${encodeURIComponent(songQuery)}`);
        const data = response.data;
        
        if (data && data.songs && data.songs.data.length > 0) {
            const results = data.songs.data.map(song => {
                const playUrl = `https://${req.get('host')}/play?id=${song.id}`;
                
                return {
                    id: song.id,
                    title: song.title.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
                    album: song.album.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
                    image: song.image.replace('50x50', '500x500'), // High Quality 
                    artist: song.more_info.music || song.description,
                    stream_url: playUrl
                };
            });

            return res.status(200).json({ success: true, results });
        }

        return res.status(404).json({ success: false, message: "No songs found." });

    } catch (error) {
        return res.status(500).json({ error: "Search failed", details: error.message });
    }
});

// ROUTE 2: Official Play/Redirect Route (Zero Third-Party Dependency)
app.get('/play', async (req, res) => {
    const songId = req.query.id;

    if (!songId) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Please provide a song 'id' parameter." });
    }

    try {
        // JioSaavn ka official song details checker v4
        const response = await axios.get(`https://www.jiosaavn.com/api.php?__call=webapi.get&pids=${songId}&type=song&_format=json&_marker=0&api_version=4&ctx=web6dot0`);
        const songData = response.data;
        
        if (songData && songData[songId]) {
            const song = songData[songId];
            
            // JioSaavn apne v4 response me direct 'media_preview_url' ya encrypted URL deta hai
            let streamUrl = '';
            
            if (song.encrypted_media_url) {
                // Agar URL encrypted hai, to hum use local script se khud decrypt karenge
                streamUrl = decryptUrl(song.encrypted_media_url);
            } else if (song.media_urls && song.media_urls.preview) {
                streamUrl = song.media_urls.preview;
            } else if (song.media_preview_url) {
                streamUrl = song.media_preview_url.replace('preview.saavncdn.com', 'aac.saavncdn.com');
            }

            if (streamUrl) {
                // DIRECT PLAY: Kisi third-party server ka koi lena-dena nahi, direct audio play!
                return res.redirect(streamUrl);
            }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: "Audio link not found in official response." });

    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Playback extraction failed", details: error.message });
    }
});

module.exports = app;

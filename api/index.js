const express = require('express');
const axios = require('axios');
const app = express();

app.get('/video-info', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).json({ error: "ID chahiye" });

    try {
        // YouTube ka official player config fetch karna (No lib, No File Write)
        const response = await axios.get(`https://www.youtube.com/get_video_info?video_id=${videoId}&el=embedded&ps=default&eurl=&hl=en_US`);
        
        // Agar yahan se data na mile, toh hum direct innertube use karenge
        const { data } = await axios.post(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_JVGgS09BI5Y7L5HnSh9A3gE0Wj7V0Y`, {
            videoId: videoId,
            context: { client: { clientName: 'ANDROID', clientVersion: '19.14.35' } }
        });

        const formats = data.streamingData.adaptiveFormats;
        res.json({ success: true, formats });

    } catch (e) {
        res.status(500).json({ error: "Fetch failed", details: e.message });
    }
});

app.listen(3000);

const { ytDL } = require('yt-dlp-exec');

app.get('/video-info', async (req, res) => {
    const videoId = req.query.id;
    // yt-dlp seedha JSON dump deta hai jo kabhi fail nahi hota
    const data = await ytDL(`https://www.youtube.com/watch?v=${videoId}`, {
        dumpSingleJson: true,
        noCheckCertificates: true,
    });
    res.json(data);
});

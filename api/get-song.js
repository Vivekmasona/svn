const https = require('https');

// Helper function: Kisi bhi URL se data fetch karne ke liye (Bina fetch dependency ke)
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error("Invalid JSON response"));
                }
            });
        }).on('error', (err) => { reject(err); });
    });
}

// Title cleaning logic
function cleanYoutubeTitle(title) {
    if (!title) return "";
    let clean = title.toLowerCase();

    clean = clean.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");

    if (clean.includes('|')) clean = clean.split('|')[0];
    if (clean.includes('-')) clean = clean.split('-')[0];
    if (clean.includes(':')) clean = clean.split(':')[0];
    if (clean.includes('/')) clean = clean.split('/')[0];

    const extraWords = ["official", "video", "audio", "lyrical", "lyrics", "full song", "hd", "4k", "remix", "lofi"];
    extraWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        clean = clean.replace(regex, "");
    });

    return clean.replace(/\s+/g, " ").trim();
}

// Main handler
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { id } = req.query;

    if (!id || id.length !== 11) {
        return res.status(400).json({ error: "Valid 11-character YouTube ID chahiye." });
    }

    try {
        // Step 1: Deno API hit karna
        const denoUrl = `https://vivekmasona-denocall-61.deno.dev/search?q=${encodeURIComponent(id)}`;
        const denoData = await makeRequest(denoUrl);

        if (!denoData || !denoData.items || denoData.items.length === 0) {
            return res.status(404).json({ error: "YouTube video nahi mili." });
        }

        const rawTitle = denoData.items[0].snippet.title;
        const shortSongName = cleanYoutubeTitle(rawTitle);
        const finalQuery = shortSongName || rawTitle.split(" ")[0];

        // Step 2: JioSaavn API hit karna
        const jioSaavnUrl = `https://svn-vivekfy.vercel.app/search/songs?query=${encodeURIComponent(finalQuery)}`;
        const songData = await makeRequest(jioSaavnUrl);

        return res.status(200).json({
            success: true,
            youtubeRawTitle: rawTitle,
            searchedWithTitle: finalQuery,
            jioSaavnResults: songData
        });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
};

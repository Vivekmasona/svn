import fetch from 'node-fetch';

// Title ko chhota aur saaf karne ka function
function cleanYoutubeTitle(title) {
    if (!title) return "";
    let clean = title.toLowerCase();

    // Brackets aur unka content hatayein
    clean = clean.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");

    // Separators se split karke pehla part lein (Kyunki main song name pehle hota hai)
    if (clean.includes('|')) clean = clean.split('|')[0];
    if (clean.includes('-')) clean = clean.split('-')[0];
    if (clean.includes(':')) clean = clean.split(':')[0];
    if (clean.includes('/')) clean = clean.split('/')[0];

    // Faltu keywords ko saaf karein
    const extraWords = [
        "official", "video", "audio", "lyrical", "lyrics", "full song", 
        "hd", "4k", "remix", "lofi", "music video", "teaser", "trailer"
    ];
    extraWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        clean = clean.replace(regex, "");
    });

    return clean.replace(/\s+/g, " ").trim();
}

export default async function handler(req, res) {
    // CORS headers taaki aap ise kisi bhi website/app se call kar sakein
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // URL se YouTube ID nikalna (?id=11_char_id)
    const { id } = req.query;

    if (!id || id.length !== 11) {
        return res.status(400).json({ error: "Valid 11-character YouTube Video ID zaroori hai." });
    }

    try {
        // Step 1: Aapki Custom Deno API se YouTube search result nikalna
        const denoUrl = `https://vivekmasona-denocall-61.deno.dev/search?q=${encodeURIComponent(id)}`;
        const denoResponse = await fetch(denoUrl);
        const denoData = await denoResponse.json();

        // Check karein ki Deno API se data mila ya nahi
        if (!denoData || !denoData.items || denoData.items.length === 0) {
            return res.status(404).json({ error: "YouTube video nahi mili ya Deno API se response nahi aaya." });
        }

        // Asli title nikalna
        const rawTitle = denoData.items[0].snippet.title;

        // Step 2: Title ko Short/Clean karna
        const shortSongName = cleanYoutubeTitle(rawTitle);
        const finalQuery = shortSongName || rawTitle.split(" ")[0];

        // Step 3: Aapki JioSaavn API par Short Title bhejna
        const jioSaavnUrl = `https://svn-vivekfy.vercel.app/search/songs?query=${encodeURIComponent(finalQuery)}`;
        const jioSaavnResponse = await fetch(jioSaavnUrl);
        const songData = await jioSaavnResponse.json();

        // Final Response bhejra hain jo aapke app me kaam aayega
        return res.status(200).json({
            success: true,
            youtubeRawTitle: rawTitle,
            searchedWithTitle: finalQuery,
            jioSaavnResults: songData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server me kuch dikkat aayi", details: error.message });
    }
}

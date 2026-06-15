// Vercel Serverless Function to proxy MyInstants MP3 files and bypass CORS restrictions.
// Vercel environment provides native global fetch in Node.js 18+.

module.exports = async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: "Missing url parameter" });
    }
    
    // Ensure the request is only proxying from myinstants to avoid open proxy vulnerability
    if (!url.startsWith("https://www.myinstants.com/")) {
        return res.status(400).json({ error: "Only myinstants.com assets can be proxied" });
    }
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: "Failed to fetch audio from MyInstants" });
        }
        
        // Copy audio headers and add CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.setHeader("Content-Type", response.headers.get("content-type") || "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
        
        // Read buffer and send response
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return res.send(buffer);
        
    } catch (err) {
        console.error("Proxy Error:", err);
        return res.status(500).json({ error: "Internal Server Error during audio proxying", details: err.message });
    }
};

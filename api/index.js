const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static('public'));

function extractId(url) {
    try {
        const u = new URL(url);
        const parts = u.pathname.split('/');
        const idx = parts.indexOf('track');
        return (idx !== -1 && parts[idx+1]) ? parts[idx+1].split('?')[0] : null;
    } catch { return null; }
}

app.get('/api/download', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.json({ success: false, message: 'Masukkan URL Spotify!' });
    }
    
    const trackId = extractId(url);
    if (!trackId) {
        return res.json({ success: false, message: 'URL tidak valid!' });
    }
    
    console.log('Track ID:', trackId);
    
    // ===== SOURCE 1: spotifydown.com =====
    try {
        console.log('Coba Source 1...');
        const r1 = await axios.get(`https://api.spotifydown.com/track?id=${trackId}`, {
            timeout: 12000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
                'Origin': 'https://spotifydown.com',
                'Referer': 'https://spotifydown.com/'
            }
        });
        
        if (r1.data && r1.data.link) {
            return res.json({
                success: true,
                data: {
                    title: r1.data.title,
                    artist: r1.data.artist,
                    album: r1.data.album || '',
                    coverUrl: r1.data.cover || '',
                    downloadUrl: r1.data.link,
                    filename: `${r1.data.artist} - ${r1.data.title}.mp3`
                }
            });
        }
    } catch(e) {
        console.log('Source 1 gagal:', e.message);
    }
    
    // ===== SOURCE 2: Spotify Official Preview =====
    try {
        console.log('Coba Source 2...');
        
        // Dapat token
        const tokenRes = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(
                        '4eb3e1a9c5e24a2d8f1d4a7b9c3e6f8a:2d8f1d4a7b9c3e6f8a4eb3e1a9c5e24a'
                    ).toString('base64')
                },
                timeout: 10000
            }
        );
        
        const token = tokenRes.data.access_token;
        
        const trackRes = await axios.get(
            `https://api.spotify.com/v1/tracks/${trackId}`,
            { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
        );
        
        const track = trackRes.data;
        
        if (track && track.preview_url) {
            return res.json({
                success: true,
                data: {
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    coverUrl: track.album.images[0]?.url || '',
                    downloadUrl: track.preview_url,
                    filename: `${track.artists[0].name} - ${track.name} (30s Preview).mp3`
                }
            });
        }
    } catch(e) {
        console.log('Source 2 gagal:', e.message);
    }
    
    // ===== GAGAL SEMUA =====
    return res.json({
        success: false,
        message: 'Server download sedang sibuk. Coba link lain atau tunggu 5 menit.'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Server ready on', PORT));

module.exports = app;
// deploy v2

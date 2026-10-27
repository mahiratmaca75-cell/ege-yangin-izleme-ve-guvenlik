require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cookieParser = require('cookie-parser');
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const app = express();
const sql = neon(process.env.DATABASE_URL);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==========================================
// ÖDEV 3: Siber Güvenlik Başlıkları (Security Headers)
// ==========================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://*.tile.openstreetmap.org https://cdn-icons-png.flaticon.com; connect-src 'self' https://firms.modaps.eosdis.nasa.gov https://api.open-meteo.com;"
  );
  next();
});

app.use(express.static(__dirname));

// Oturum Doğrulama Middleware'i
async function oturumKontrol(req, res, next) {
  const token = req.cookies.admin_token;
  if (!token) {
    return res.status(401).json({ hata: 'Yetkisiz erişim. Lütfen giriş yapın.' });
  }

  const oturumlar = await sql`
    SELECT * FROM oturumlar 
    WHERE token = ${token} AND bitis > NOW() 
    LIMIT 1
  `;

  if (oturumlar.length === 0) {
    return res.status(401).json({ hata: 'Geçersiz veya süresi dolmuş oturum.' });
  }

  next();
}

// Giriş API Endpoint'i
app.post('/api/auth/login', async (req, res) => {
  try {
    const { eposta, sifre } = req.body;
    if (!eposta || !sifre) {
      return res.status(400).json({ hata: 'E-posta ve şifre zorunludur.' });
    }

    const yoneticiler = await sql`SELECT * FROM yoneticiler WHERE eposta = ${eposta.trim()} LIMIT 1`;
    if (yoneticiler.length === 0) {
      return res.status(401).json({ hata: 'Geçersiz e-posta veya şifre.' });
    }

    const yonetici = yoneticiler[0];
    const sifreDogruMu = await bcrypt.compare(sifre, yonetici.sifre_hash);
    if (!sifreDogruMu) {
      return res.status(401).json({ hata: 'Geçersiz e-posta veya şifre.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const bitis = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO oturumlar (token, yonetici_id, bitis)
      VALUES (${token}, ${yonetici.id}, ${bitis})
    `;

    res.cookie('admin_token', token, {
      httpOnly: true,
      expires: bitis,
      path: '/'
    });

    res.json({ basarili: true });
  } catch (error) {
    console.error("Giriş Hatası:", error);
    res.status(500).json({ hata: 'Sunucu hatası oluştu.' });
  }
});

// Çıkış API Endpoint'i
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.cookies.admin_token;
    if (token) {
      await sql`DELETE FROM oturumlar WHERE token = ${token}`;
      res.clearCookie('admin_token');
    }
    res.json({ basarili: true });
  } catch (error) {
    res.status(500).json({ hata: 'Çıkış sırasında hata oluştu.' });
  }
});

// Sosyal Bağlantılar API
app.get('/api/sosyal-baglantilar', async (req, res) => {
  try {
    const baglantilar = await sql`SELECT * FROM sosyal_baglantilar ORDER BY id ASC`;
    res.json(baglantilar);
  } catch (error) {
    res.status(500).json({ hata: 'Veriler alınamadı.' });
  }
});

app.post('/api/sosyal-baglantilar', oturumKontrol, async (req, res) => {
  try {
    const { platform, url, gorunen_ad } = req.body;
    await sql`
      INSERT INTO sosyal_baglantilar (platform, url, gorunen_ad, aktif)
      VALUES (${platform}, ${url}, ${gorunen_ad || platform}, true)
    `;
    res.json({ basarili: true });
  } catch (error) {
    res.status(500).json({ hata: 'Bağlantı eklenemedi.' });
  }
});

app.delete('/api/sosyal-baglantilar/:id', oturumKontrol, async (req, res) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM sosyal_baglantilar WHERE id = ${id}`;
    res.json({ basarili: true });
  } catch (error) {
    res.status(500).json({ hata: 'Bağlantı silinemedi.' });
  }
});

// ==========================================
// ÖDEV 2: EGE AKTİF YANGIN & RÜZGÂR API HATTI
// ==========================================
app.get('/api/yanginlar', async (req, res) => {
  try {
    const mapKey = process.env.NASA_FIRMS_KEY;
    const egeKutusu = '26,36,30,40';
    const gunSayisi = req.query.gun || '3';

    const nasaUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${egeKutusu}/${gunSayisi}`;
    
    const response = await fetch(nasaUrl);
    const csvData = await response.text();

    const satirlar = csvData.trim().split('\n');
    if (satirlar.length <= 1) {
      return res.json({ noktalar: [], sonGuncelleme: new Date().toISOString() });
    }

    const basliklar = satirlar[0].split(',');
    const latIdx = basliklar.indexOf('latitude');
    const lonIdx = basliklar.indexOf('longitude');
    const brightIdx = basliklar.indexOf('bright_ti4');
    const dateIdx = basliklar.indexOf('acq_date');
    const timeIdx = basliklar.indexOf('acq_time');

    const yanginlar = [];
    for (let i = 1; i < satirlar.length; i++) {
      const sutunlar = satirlar[i].split(',');
      if (sutunlar.length > lonIdx) {
        yanginlar.push({
          id: i,
          enlem: parseFloat(sutunlar[latIdx]),
          boylam: parseFloat(sutunlar[lonIdx]),
          sicaklik: parseFloat(sutunlar[brightIdx]),
          tarih: sutunlar[dateIdx],
          saat: sutunlar[timeIdx]
        });
      }
    }

    let ruzgar = { hiz: 14.5, yon: 315 };
    try {
      const ruzgarRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.42&longitude=27.14&current=wind_speed_10m,wind_direction_10m');
      const ruzgarData = await ruzgarRes.json();
      if (ruzgarData.current) {
        ruzgar = {
          hiz: ruzgarData.current.wind_speed_10m,
          yon: ruzgarData.current.wind_direction_10m
        };
      }
    } catch (e) {
      console.warn("Rüzgar verisi alınamadı, varsayılan kullanılıyor.");
    }

    res.json({
      noktalar: yanginlar,
      ruzgar: ruzgar,
      sonGuncelleme: new Date().toLocaleString('tr-TR')
    });
  } catch (error) {
    console.error("Yangın Verisi Çekilemedi:", error);
    res.status(500).json({ hata: 'Yangın verileri sunucudan çekilemedi.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
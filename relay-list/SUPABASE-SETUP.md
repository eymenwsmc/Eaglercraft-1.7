# 🚀 Supabase Setup Guide

Bu guide Eaglercraft Relay List'i Supabase ile nasıl deploy edeceğini gösteriyor.

## 📋 Gereksinimler

- Supabase hesabı (ücretsiz: https://supabase.com)
- Modern web browser

## 🔧 Adım Adım Kurulum

### 1. Supabase Projesi Oluştur

1. https://supabase.com adresine git
2. "Start your project" butonuna tıkla
3. GitHub/Google ile giriş yap
4. "New Project" butonuna tıkla
5. Proje bilgilerini doldur:
   - **Name**: `eaglercraft-relay-list`
   - **Database Password**: Güçlü bir şifre seç (kaydet!)
   - **Region**: En yakın bölgeyi seç
   - **Pricing Plan**: Free (ücretsiz)
6. "Create new project" butonuna tıkla
7. Proje oluşturulmasını bekle (~2 dakika)

### 2. Database Schema'yı Kur

1. Supabase dashboard'da sol menüden **"SQL Editor"** seç
2. "New query" butonuna tıkla
3. `supabase-setup.sql` dosyasının içeriğini kopyala
4. SQL Editor'e yapıştır
5. **"Run"** butonuna tıkla (veya Ctrl+Enter)
6. ✅ "Success. No rows returned" mesajını gör

### 3. API Credentials'ı Al

1. Sol menüden **"Settings"** → **"API"** seç
2. Şu bilgileri kopyala:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. Kodu Güncelle

1. `script-supabase.js` dosyasını aç
2. Üstteki satırları güncelle:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // Senin Project URL'in
const SUPABASE_ANON_KEY = 'eyJhbGci...'; // Senin anon key'in
```

3. Dosyayı kaydet

### 5. Test Et

1. `index-supabase.html` dosyasını tarayıcıda aç
2. F12 bas → Console'u aç
3. Şu mesajları göreceksin:
   ```
   ✅ Supabase initialized
   ✅ Realtime updates enabled
   ✅ Loaded 0 servers from database
   ✅ Auto-verification started (every 30 seconds)
   ```

4. "Add Your Server" butonuna tıkla
5. Formu doldur ve submit et
6. ✅ Server listeye eklenecek!

## 🌐 Deploy (Hosting)

### Option 1: GitHub Pages (Ücretsiz)

1. GitHub'da yeni repo oluştur
2. Dosyaları upload et:
   - `index-supabase.html` → `index.html` olarak rename et
   - `script-supabase.js`
   - `style.css`
3. Repo Settings → Pages → Source: main branch
4. ✅ Site yayında: `https://username.github.io/repo-name`

### Option 2: Netlify (Ücretsiz)

1. https://netlify.com adresine git
2. "Add new site" → "Deploy manually"
3. Dosyaları sürükle-bırak:
   - `index-supabase.html` → `index.html` olarak rename et
   - `script-supabase.js`
   - `style.css`
4. ✅ Site yayında!

### Option 3: Vercel (Ücretsiz)

1. https://vercel.com adresine git
2. "New Project" → "Import Git Repository"
3. GitHub repo'nu seç
4. ✅ Otomatik deploy!

## 🔒 Güvenlik

### Row Level Security (RLS)

Database zaten RLS ile korunuyor:
- ✅ Herkes server'ları görebilir
- ✅ Herkes server ekleyebilir
- ✅ Herkes server güncelleyebilir (verification için)
- ✅ Sadece offline server'lar silinebilir

### Rate Limiting

Supabase otomatik rate limiting yapıyor:
- Free plan: 500 requests/second
- Yeterli çoğu kullanım için

### API Key Güvenliği

- `anon` key public'tir (client-side'da kullanılır)
- RLS ile korunur
- `service_role` key'i **asla** client-side'da kullanma!

## 📊 Database Yönetimi

### Server'ları Görüntüle

1. Supabase dashboard → **"Table Editor"**
2. `servers` tablosunu seç
3. Tüm server'ları göreceksin

### Manuel Server Ekle

SQL Editor'de:
```sql
INSERT INTO servers (name, description, join_code, relay, players, status)
VALUES ('Test Server', 'This is a test', 'abc12', 'wss://relay.deev.is/', 5, 'online');
```

### Offline Server'ları Temizle

SQL Editor'de:
```sql
SELECT cleanup_offline_servers();
```

### Stats Görüntüle

SQL Editor'de:
```sql
-- Toplam server sayısı
SELECT COUNT(*) FROM servers WHERE status = 'online';

-- Toplam oyuncu sayısı
SELECT SUM(players) FROM servers WHERE status = 'online';

-- Relay'e göre dağılım
SELECT relay, COUNT(*) as count, SUM(players) as total_players
FROM servers
WHERE status = 'online'
GROUP BY relay;
```

## 🔄 Realtime Updates

Supabase Realtime otomatik çalışıyor:
- ✅ Yeni server eklenince → Tüm kullanıcılar görür
- ✅ Server güncellenince → Anında güncellenir
- ✅ Server silinince → Listeden kaybolur

## 🐛 Troubleshooting

### "Failed to initialize database connection"

- Supabase URL ve API key'i kontrol et
- Supabase projesi çalışıyor mu kontrol et
- Console'da hata mesajlarını oku

### "Failed to add server to database"

- Join code zaten var mı kontrol et
- Join code formatı doğru mu (5 karakter, a-z0-9)
- RLS policy'leri doğru mu kontrol et

### Realtime çalışmıyor

- Supabase Realtime enabled mi kontrol et (Settings → API)
- Console'da "Realtime updates enabled" mesajını gör
- Network tab'da WebSocket bağlantısını kontrol et

## 📈 Monitoring

### Supabase Dashboard

1. **Database** → Tablo boyutları, row sayıları
2. **API** → Request sayıları, response times
3. **Logs** → Error logs, query logs
4. **Reports** → Kullanım istatistikleri

### Browser Console

```javascript
// Toplam server sayısı
console.log('Total servers:', app.servers.length);

// Online server'lar
console.log('Online:', app.servers.filter(s => s.status === 'online').length);

// Verification durumu
console.log('Verifying:', app.isVerifying);
```

## 🎯 Best Practices

1. **Backup**: Supabase otomatik backup yapıyor (7 gün)
2. **Monitoring**: Supabase dashboard'u düzenli kontrol et
3. **Updates**: Supabase otomatik güncelleniyor
4. **Security**: API key'leri asla public repo'ya commit etme
5. **Performance**: Index'ler zaten optimize edilmiş

## 💡 Tips

- **Free Plan Limits**:
  - 500 MB database
  - 1 GB bandwidth/ay
  - 50,000 monthly active users
  - Çoğu kullanım için yeterli!

- **Upgrade**:
  - Pro plan: $25/ay
  - Daha fazla storage, bandwidth, realtime connections

## 🆘 Destek

- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: Bu repo'da issue aç

---

**Hazır! 🎉 Artık Eaglercraft Relay List Supabase ile çalışıyor!**

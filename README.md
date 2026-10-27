# 🔥 Ege Aktif Yangın İzleme ve Güvenlik Paneli

Ege Bölgesi'ndeki aktif yangın ve termal anomalileri uydu verileri ve meteorolojik katmanlarla gerçek zamanlı izleyen, düşük bant genişliğinde ve çevrimdışı koşullarda çalışmaya dayanıklı karar destek sistemi.

## 🔗 Hızlı Bağlantılar
- **Canlı Yayın (GitHub Pages):** [Paneli Başlat](https://mahiratmaca75-cell.github.io/ege-yangin-izleme-ve-guvenlik/yangin.html)
- **Vaka Analizi (Case Study):** [Vaka İncelemesi](https://mahiratmaca75-cell.github.io/ege-yangin-izleme-ve-guvenlik/yangin-vaka.html)

---

## 📌 Proje Özeti ve Hedef Kitle
- **Hedef Kullanıcı:** Ege Bölgesi'nde sahada operasyon yürüten sivil koordinasyon ve yangınla mücadele gönüllüleri.
- **Çözülen Problem:** Sahadaki zayıf hücresel veri altyapısında ağır web haritalarının kilitlenmesi sorununa karşılık; hafif, istemci taraflı kümeleme (clustering) yapan ve statik modda dahi veri sunabilen optimize bir arayüz sunar.

---

## 🛠️ Sistem Mimarisi & Veri Hattı

1. **NASA FIRMS (VIIRS) Uydu Katmanı:** Ege koordinat kutusundaki ($36.5^{\circ}\text{N}-40.2^{\circ}\text{N},\; 26.0^{\circ}\text{E}-29.5^{\circ}\text{E}$) termal noktaları ve parlaklık derecelerini sağlar.
2. **Open-Meteo API:** Yangının olası yayılma yönünü ve risk katsayısını belirlemek için anlık rüzgâr hızı ($km/s$) ve açısını sisteme entegre eder.
3. **Frontend & Çevrimdışı Katman:** Leaflet.js ve Leaflet.markercluster ile binlerce termal nokta DOM şişmesi yaşanmadan gruplanır. Ağ kesintilerinde fallback (statik yedek) mekanizması devreye girer.

---

## 🚀 Öne Çıkan Özellikler
- **3 Temel KPI Kartı:** Anlık tespit sayısı, bölgesel rüzgâr vektörü ve tepe sıcaklık ($Kelvin$).
- **Dinamik Zaman Filtreleme:** Son 24, 48 ve 72 saatlik veri aralığı seçimi.
- **Analitik Görselleştirme:** Chart.js ile günlük yangın frekansı dağılım grafiği.
- **Mobil Uyumlu & Responsive Tasarım:** Sahada mobil cihazlardan kolay erişim.

---

## 💻 Yerel Geliştirme Ortamı

```bash
# Depoyu klonlayın
git clone [https://github.com/mahiratmaca75-cell/ege-yangin-izleme-ve-guvenlik.git](https://github.com/mahiratmaca75-cell/ege-yangin-izleme-ve-guvenlik.git)

# Proje dizinine geçin
cd ege-yangin-izleme-ve-guvenlik

# Bağımlılıkları yükleyin ve sunucuyu başlatın
npm install
node sunucu.js

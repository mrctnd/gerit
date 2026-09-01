# Değişiklik günlüğü

Bu proje [Semantic Versioning](https://semver.org/) kullanır. Kullanıcıyı etkileyen değişiklikler bu dosyada tutulur.

## [Yayımlanmadı]

### Eklendi

- Tarihli açık ve tamamlanmış işleri aynı ay üzerinde gösteren, önceki/sonraki ay geçişleri ve ay özeti bulunan büyük görev takvimi.
- Dar ekranlarda aylık ızgara yerine tarih bazlı okunaklı gündem görünümü.

### Değişti

- Görev navigasyonu **Bugün**, **Takvim**, **Tüm İşler** ve **Tamamlananlar** olmak üzere dört anlaşılır girişte toplandı; mevcut eski bağlantılar korunarak **Tüm İşler** görünümüne yönlendirildi.
- **Tüm İşler** ekranı görevleri **Şimdi**, **Yapılacak** ve **Bekleyen / Engellenen** gruplarına ayıran daha sade bir öncelik kuyruğuna dönüştürüldü.
- Bugün özeti, görev satırları, hızlı ekleme ve görev düzenleme ekranlarındaki ikincil bilgiler azaltıldı; ilerleme, özel hatırlatma ve tekrar alanları isteğe bağlı ayrıntılara taşındı.

## [0.3.1] - 2026-08-31

### Eklendi

- Türkçe ve İngilizce README'ye Windows setup, Linux paketi, Docker, GitHub CLI ve kaynak arşivleri için görünür hızlı indirme merkezi.
- Release dosyalarını doğrulamak için otomatik üretilen `SHA256SUMS.txt`.

### Değişti

- Genel görev ekranları daha geniş bir çalışma alanına taşındı; Presales ve Aksiyon Merkezi geniş ekranlarda kullanılabilir yatay alanı daha iyi değerlendiriyor.
- Windows güncelleme, yerel veri koruma ve indirme doğrulama adımları daha açık hale getirildi.

## [0.3.0] - 2026-08-30

### Eklendi

- Para birimi bazında tahmini teklif bedeli, yaklaşık maliyet, marj, kazanma olasılığı ve ağırlıklı pipeline.
- Fırsat türü, dosya önceliği ve müşteri termininden önce doğrulanan iç kalite termini.
- MEDDPICC tabanlı sekiz boyutlu fırsat yeterlilik matrisi ve otomatik hazırlık skoru.
- Rol, etki, tutum, iletişim ve not alanlarıyla düzenlenebilir paydaş haritası.
- Sorumlu, durum, öncelik, termin, hatırlatma ve not içeren proje aksiyon planı.
- Kritik bulgu, teyit, yeterlilik engeli, yaklaşan termin ve geciken aksiyonları birleştiren Aksiyon ve Uyarı Merkezi.
- Ayarlanabilir günlük özet saati, presales özeti ve veri kaybetmeden erteleme yapan sessiz saatler.
- Windows bildiriminden ilgili görev, presales dosyası, bulgu veya aksiyona doğrudan geçiş ve **Aç** eylemi.
- Dosya içi sabit bölüm navigasyonu ve canlı portföy filtresi.

### Değişti

- Presales JSON dışa aktarma şeması yeterlilik, paydaş ve aksiyonları içeren sürüm 3'e yükseltildi.
- Günlük özet görevlerin yanında aktif presales portföyünü, yakın terminleri ve kritik konu sayısını gösteriyor.
- Portföy ve dosya ekranları 4K, masaüstü ve dar ekranlarda daha yoğun ama taranabilir bir komuta merkezi düzenine taşındı.
- Global arama artık paydaş, proje aksiyonu ve yeterlilik notlarını da kapsıyor.

## [0.2.1] - 2026-08-29

### Eklendi

- Presales dosyalarına küçük `+` düğmesiyle birden fazla üretici/marka, ürün ailesi/kategori ve teklif edilen model satırı ekleme.
- Presales **Mevcut aşama** seçeneklerine **Yaklaşık maliyet çalışması**.
- Görünüm paneline `%80-%160` arayüz ölçeği, adım düğmeleri ve canlı hareket önizlemesi.
- Akıcı profilde daha belirgin sayfa/kayıt girişleri ve profesyonel, ölçülü mikro etkileşimler.

### Değişti

- Hareket profilleri artık süre, mesafe ve sıralama açısından birbirinden görünür biçimde ayrılıyor; sakin profil hareketi kapatıyor.
- Presales liste ve ayrıntı görünümü çoklu ürünleri özetleyecek şekilde genişletildi.
- Eski tek ürünlü presales verileri ilk açılışta kayıpsız biçimde yeni ürün listesine taşınıyor.
- Tema, font, hareket ve ölçek tercihleri aynı yerel SQLite veritabanında kalıcı olarak saklanıyor.

## [0.2.0] - 2026-08-28

### Eklendi

- Müşteri, ihale/fırsat referansı, üretici, ürün ailesi, teklif edilen model, rakip, sorumlu, termin, sonraki aksiyon ve teklif verilebilirlik kararı tutan Presales Merkezi.
- Şartname maddesi, BOM/kitlist bulgusu, ürün kararı, rekabet, değişiklik talebi, şartname cevabı, maliyet/sorumluluk ve üretici sorusu için sekiz ayrı kayıt türü.
- Her analiz kaydında platform kabiliyeti, BOM'a dahil olma, konfigürasyon uyumluluğu ve lisans/servis entitlement kanıtlarını ayrı izleyen dört kanıt kapısı.
- `Uygun`, `Şartlı Uygun`, `Uygun Değil - Değişiklik Gerekli`, `Teyit / Netleştirme` ve `Kapsam Dışı` statüleri.
- Olasılık, etki ve kanıt açığına göre Kritik/Yüksek/Orta/Düşük risk puanlaması.
- Madde/SKU/adet, orijinal metin, atomik gereksinim, teklif karşılığı, cevap modu, önerilen değişiklik, maliyet, sorumluluk, aksiyon ve güven seviyesi alanları.
- Presales dosyası ve kayıt aksiyonları için yerel masaüstü hatırlatmaları.
- Presales içeriğini genel aramada bulma ve dosya bazında eksiksiz JSON dışa aktarma.
- Presales veri geçişi, kalıcılık, kanıt, arama, dışa aktarma, validasyon ve tek seferlik bildirim testleri.

### Değişti

- Gerit, kişisel görev yöneticisinin yanında presales ve solution architecture iş akışlarını da aynı yerel SQLite dosyasında yönetir.
- Sol menü ve responsive arayüz, yoğun presales portföyü ve analiz kayıtları için genişletildi.

## [0.1.1] - 2026-08-28

### Eklendi

- Windows'ta Node.js veya Docker gerektirmeden çalışan Electron masaüstü uygulaması ve NSIS kurulum paketi.
- Masaüstü sürümünde veriyi kullanıcıya özel `%APPDATA%\\Gerit\\data` klasöründe tutan yerel SQLite çalışma biçimi.
- İnternet bağlantısı gerektirmeyen yerel Windows bildirimleri ve tek uygulama örneği yönetimi.
- Üst bardan yerel bildirimleri sınamak için **Dene** aksiyonu.
- Planlandı, Devam ediyor, Beklemede ve Bloke aşamalarını gruplandıran İş Akışı görünümü.
- Görev bazında ilerleme yüzdesi ve liste üzerinde ilerleme göstergesi.
- Son tarihten önce seçilebilen özel hatırlatma zamanı; son tarih bildirimi ayrıca korunur.
- Görev ayrıntısında zaman damgalı çalışma notları ve bu notlar içinde arama.
- Atlas, Orman, Lavanta ve Kehribar renk paletleri.
- Modern, Humanist, Editoryal ve Teknik yerel font setleri.
- Sistem, akıcı ve sakin hareket tercihleriyle sayfa ve görev mikro etkileşimleri.
- Gerit ana işareti, küçük boyut varyantı ve açık kaynak marka kullanım paketi.

### Değişti

- GitHub Release otomasyonu Windows arşivi yerine kurulabilir `Gerit-Setup-*.exe` dosyası üretir.
- Windows kurulum paketi imzasız açık kaynak dağıtım için sertifika aramadan üretilir.
- Windows paketleme komutu tag build'lerinde otomatik GitHub publish denemesi yapmaz.
- SQLite veri katmanı, masaüstü paketinde yerel C++ derleyicisi gerektirmeyen Node.js `node:sqlite` modülüne taşındı.
- Üst çubuk, görev kartları, hızlı ekleme ve mobil görünüm yeni tasarım sistemiyle iyileştirildi.
- Görünüm tercihleri artık port bazlı tarayıcı deposu yerine görevlerle aynı yerel SQLite veritabanında saklanıyor.
- Günlük özet bildirimi uygulama 07:00'den sonra açılırsa o gün bir kez gönderilir; başarısız bildirimler gönderilmiş sayılmaz.
- Sayfa ve görünüm değişimlerindeki otomatik içerik giriş animasyonu kaldırıldı; yalnızca doğrudan işlem geri bildirimleri hareketli kaldı.
- JavaScript ve CSS dosyaları için sürüm adresi ve yeniden doğrulama eklendi; açık sekmelerin eski hareket kodunu kullanması engellendi.

## [0.1.0] - 2026-08-23

### Eklendi

- Türkçe, klavye odaklı ve sunucu tarafında oluşturulan görev arayüzü.
- Türkçe ve İngilizce doğal dil destekli hızlı ekleme.
- Projeler, öncelikler, notlar, arama ve tekrar eden görevler.
- Bugün, Yaklaşan, Gelen Kutusu, proje ve Tamamlananlar görünümleri.
- ntfy hatırlatmaları ve saat 07:00 günlük özeti.
- Terminalden görev eklemek için `t add` komutu.
- Docker, GitHub Actions, Linux VM ve otomatik SQLite yedekleme dosyaları.
- MIT lisansı ve açık kaynak katkı belgeleri.

[0.3.0]: https://github.com/mrctnd/gerit/releases/tag/v0.3.0
[0.2.1]: https://github.com/mrctnd/gerit/releases/tag/v0.2.1
[0.2.0]: https://github.com/mrctnd/gerit/releases/tag/v0.2.0
[0.1.1]: https://github.com/mrctnd/gerit/releases/tag/v0.1.1
[0.1.0]: https://github.com/mrctnd/gerit/releases/tag/v0.1.0

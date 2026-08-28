# Değişiklik günlüğü

Bu proje [Semantic Versioning](https://semver.org/) kullanır. Kullanıcıyı etkileyen değişiklikler bu dosyada tutulur.

## [Yayımlanmadı]

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

[0.1.1]: https://github.com/mrctnd/gerit/releases/tag/v0.1.1
[0.1.0]: https://github.com/mrctnd/gerit/releases/tag/v0.1.0

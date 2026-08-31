<p align="center">
  <img src="public/brand/gerit-mark.png" alt="Gerit logosu" width="116">
</p>

<h1 align="center">Gerit</h1>

<p align="center"><strong>Görev, fırsat, şartname, BOM ve presales aksiyonlarını kendi bilgisayarında yöneten yerel çalışma merkezi.</strong></p>

<p align="center"><strong>Türkçe</strong> · <a href="README.en.md">English</a></p>

<p align="center">
  <a href="https://github.com/mrctnd/gerit/actions/workflows/ci.yml"><img alt="Test durumu" src="https://github.com/mrctnd/gerit/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/mrctnd/gerit/releases"><img alt="Son sürüm" src="https://img.shields.io/github/v/release/mrctnd/gerit?display_name=tag"></a>
  <a href="LICENSE"><img alt="MIT lisansı" src="https://img.shields.io/badge/license-MIT-2563eb.svg"></a>
  <a href="https://nodejs.org/"><img alt="Node.js 22 ve üzeri" src="https://img.shields.io/badge/Node.js-22%2B-3c873a.svg"></a>
</p>

<p align="center">
  <a href="https://github.com/mrctnd/gerit/releases/download/v0.3.1/Gerit-Setup-0.3.1-x64.exe"><img alt="Windows x64 setup indir" src="https://img.shields.io/badge/Windows_x64-Setup_indir-0a66c2?logo=windows11&logoColor=white"></a>
  <a href="https://github.com/mrctnd/gerit/releases/download/v0.3.1/gerit-v0.3.1-linux-x64.tar.gz"><img alt="Linux x64 paket indir" src="https://img.shields.io/badge/Linux_x64-Paketi_indir-333333?logo=linux&logoColor=white"></a>
  <a href="https://github.com/mrctnd/gerit/releases"><img alt="Tüm sürümler" src="https://img.shields.io/badge/GitHub-Tum_surumler-24292f?logo=github&logoColor=white"></a>
</p>

**Gerit**, görevlerini ve presales çalışmalarını tek yerde yürütmen için tasarlanmış Türkçe, klavye odaklı ve yerel öncelikli çalışma merkezidir. Hesap, telemetri, reklam, iş birliği veya çevrimdışı eşitleme yoktur. Bütün veriniz yedekleyebileceğiniz tek bir SQLite dosyasında kalır.

Adı Latince *gerere* kökünden gelir: “yürütmek, yerine getirmek”.

## Hemen başla

| Kurulum yolu | Kimler için? | Gereksinim | Başlangıç |
| --- | --- | --- | --- |
| **Windows x64 setup** (önerilen) | Windows 10/11 kullanıcıları | Yok | [Setup dosyasını doğrudan indir](https://github.com/mrctnd/gerit/releases/download/v0.3.1/Gerit-Setup-0.3.1-x64.exe) |
| **Docker Compose** | Kolay güncelleme ve taşınabilir servis isteyenler | Docker Desktop veya Docker Engine | [Docker adımlarına git](#docker-ile-kurulum) |
| **Linux x64 paketi** | Hazır üretim bağımlılıklarıyla çalıştırmak isteyenler | Node.js 22.13+ | [Linux paketini doğrudan indir](https://github.com/mrctnd/gerit/releases/download/v0.3.1/gerit-v0.3.1-linux-x64.tar.gz) |
| **Kaynak kod** | Geliştiriciler ve özelleştirme yapanlar | Git, Node.js 22.13+, npm 10+ | [Node.js adımlarına git](#nodejs-ile-kurulum) |

Windows kullanıyorsanız ilk seçeneği indirin, setup'ı çalıştırın ve **Gerit** kısayolunu açın. Güncelleme için uygulamayı kapatıp yeni setup'ı mevcut kurulumun üzerine çalıştırmanız yeterlidir; görevleriniz, presales dosyalarınız ve görünüm ayarlarınız korunur.

Sürüm dosyalarının tamamı [GitHub Releases](https://github.com/mrctnd/gerit/releases) sayfasındadır. GitHub CLI kullananlar kurulumu terminalden de indirebilir:

```powershell
gh release download v0.3.1 --repo mrctnd/gerit --pattern "Gerit-Setup-*.exe"
```

Kaynak kodu arşiv olarak almak için [ZIP](https://github.com/mrctnd/gerit/archive/refs/tags/v0.3.1.zip) veya [tar.gz](https://github.com/mrctnd/gerit/archive/refs/tags/v0.3.1.tar.gz) bağlantısını kullanabilirsiniz.

## Neler sunuyor?

- `n` ile yeni iş, `x` ile tamamlama, `/` ile arama
- Türkçe ve İngilizce doğal tarih: `yarın 16:00`, `cuma 09:30`, `tomorrow 4pm`
- Tek satırda proje ve öncelik: `#finans p1`
- Tekrarlar: `her pazartesi,perşembe`, `her ayın 1’i`, `every mon,thu` ve RRULE
- Bugün, Yaklaşan, Gelen Kutusu, proje ve Tamamlananlar görünümleri
- Planlandı, Devam ediyor, Beklemede ve Bloke aşamalarını bir arada gösteren İş Akışı görünümü
- Her iş için yüzde ilerleme, ayrıntılı açıklama ve zaman damgalı çalışma notları
- Geciken işleri Bugün görünümünün en üstünde kırmızı sabitleme
- Serbest metin notları, görev kopyalama ve yeniden açma
- Dört renk paleti, dört yerel font seti, `%80-%160` arayüz ölçeği ve cihazda saklanan görünüm tercihleri
- Sistem, akıcı ve sakin profillerde belirgin ama ölçülü mikro etkileşimler
- Masaüstünde yerel Windows bildirimi; isteğe bağlı olarak ntfy ile telefon bildirimi
- Müşteri, ihale/fırsat referansı, üretici, ürün/model, rakip, termin ve teklif kararıyla Presales Merkezi
- Fırsat türü, öncelik, teklif bedeli, yaklaşık maliyet, marj, kazanma olasılığı ve para birimiyle ağırlıklı pipeline
- MEDDPICC tabanlı sekiz başlıklı yeterlilik değerlendirmesi, karar ağı/paydaş haritası ve iç proje aksiyon planı
- Kritik bulgu, teyit, yaklaşan termin ve geciken aksiyonları birleştiren Aksiyon ve Uyarı Merkezi
- Şartname maddesi, BOM/kitlist, ürün kararı, rekabet, değişiklik talebi, şartname cevabı, maliyet ve üretici teyidi kayıtları
- Platform kabiliyeti, BOM'a dahil olma, konfigürasyon uyumu ve lisans/servis entitlement kanıtlarını ayrı izleme
- Standart uygunluk statüleri, risk puanı, sorumlu/aksiyon takibi, yerel hatırlatma ve dosya bazlı JSON dışa aktarma
- Her terminalden `t add "..."` ile hızlı yakalama
- Express + EJS + yerleşik `node:sqlite`; istemci çerçevesi ve bulut hesabı yok

## Windows masaüstü kurulumu

1. [`Gerit-Setup-0.3.1-x64.exe`](https://github.com/mrctnd/gerit/releases/download/v0.3.1/Gerit-Setup-0.3.1-x64.exe) dosyasını indirin.
2. Setup'ı açın, yalnızca kendi kullanıcı hesabınız için kurulum klasörünü seçin.
3. Başlat menüsü veya masaüstündeki **Gerit** kısayolunu açın.
4. Bildirim izni sorulursa hatırlatmaları alabilmek için izin verin.

- Node.js, Docker, hesap veya internet bağlantısı gerekmez.
- Uygulama yalnızca kendi bilgisayarınızdaki `127.0.0.1` adresini kullanır; yerel ağa açılmaz.
- Görevler, presales dosyaları ve görünüm tercihleri `%APPDATA%\Gerit\data\tasks.sqlite3` dosyasında tutulur ve başka bir bilgisayara gönderilmez.
- Masaüstü sürümünde hatırlatmalar ve günlük özet Windows bildirimi olarak yerel gönderilir.
- Kaldırma işlemi veri dosyasını silmez. Yeniden kurduğunuzda görevleriniz kaldığı yerden açılır.
- Kurulum paketi henüz kod imzalı değilse Windows SmartScreen ilk çalıştırmada yayıncı uyarısı gösterebilir.

### İndirmeyi doğrulama

Her sürümde yayınlanan [`SHA256SUMS.txt`](https://github.com/mrctnd/gerit/releases/download/v0.3.1/SHA256SUMS.txt) dosyasındaki değer ile indirdiğiniz setup'ın özetini karşılaştırın:

```powershell
Get-FileHash .\Gerit-Setup-0.3.1-x64.exe -Algorithm SHA256
```

## Docker ile kurulum

[Docker Desktop](https://www.docker.com/products/docker-desktop/) veya Docker Engine + Compose gerekir.

```sh
git clone https://github.com/mrctnd/gerit.git
cd gerit
docker compose up -d --build
```

Ardından [http://127.0.0.1:3030](http://127.0.0.1:3030) adresini açın. Docker içeride `0.0.0.0` dinlese de Compose portu yalnızca ana makinenin `127.0.0.1` adresine bağlar; uygulama yerel ağda kendiliğinden açılmaz.

```sh
docker compose logs -f gerit       # günlükler
docker compose down                # durdur
git pull --ff-only && docker compose up -d --build   # güncelle
```

## Linux x64 paketi

[`gerit-v0.3.1-linux-x64.tar.gz`](https://github.com/mrctnd/gerit/releases/download/v0.3.1/gerit-v0.3.1-linux-x64.tar.gz) paketini indirin ve arşivi açın. Node.js 22.13+ kurulu olmalıdır.

Linux:

```sh
chmod +x gerit/scripts/start.sh
./gerit/scripts/start.sh
```

Paketler üretim bağımlılıklarını içerir; ilk açılışta `.env` ve veri klasörü otomatik hazırlanır.

## Node.js ile kurulum

Node.js 22.13 veya daha yenisi gerekir.

```sh
git clone https://github.com/mrctnd/gerit.git
cd gerit
npm ci
npm run setup
npm start
```

Tarayıcıdan [http://127.0.0.1:3030](http://127.0.0.1:3030) adresini açın. İlk çalıştırmada `.env` ve yerel veri klasörü hazırlanır.

Geliştirme sırasında otomatik yeniden başlatma:

```sh
npm run dev
```

Masaüstü sürümünü kaynak koddan açmak veya Windows kurulum dosyasını üretmek için:

```powershell
npm run desktop
npm run desktop:dist
```

Kurulum dosyası `release/desktop` klasöründe oluşturulur.

## Hızlı ekleme

```text
Müşteri teklifini yarın 16:00 gönder #satış p1
Haftalık raporu cuma 10:30 hazırla #yönetim p2
Operasyon toplantısı her pazartesi,perşembe 09:00 #operasyon p2
Faturaları her ayın 1’i kontrol et #finans p1
call Sam tomorrow 4pm #home p2
```

- `#proje` işi bir projeye bağlar.
- `p1`, `p2`, `p3` önceliği belirler.
- Tarih verilmezse iş Gelen Kutusu'na düşer.
- İş ayrıntısından açıklama, aşama, ilerleme yüzdesi, tarih, özel hatırlatma, proje, öncelik ve RRULE düzenlenebilir.
- İş notları çalışma günlüğüne zaman damgalı olarak eklenir ve genel aramada bulunur.
- Tekrarlanan iş tamamlandığında sıradaki oluşum otomatik oluşturulur.

## Presales Merkezi

Sol menüdeki **Presales Merkezi**, her müşteri talebi veya ihale için ayrı bir çalışma dosyası açar. Dosyada müşteri ve referans bilgileri, birden fazla üretici/marka, ürün ailesi ve teklif edilen model; rakipler, sorumlu, son tarih, sonraki aksiyon, mevcut satış aşaması ve `Teklif verilebilir / Şartlı / Verilemez` kararı tutulur. Ürün satırları küçük `+` düğmesiyle çoğaltılabilir; satış aşamaları arasında **Yaklaşık maliyet çalışması** da bulunur.

Her dosyanın altında aşağıdaki çalışma türleri ayrı kayıtlar olarak izlenir:

- Şartname maddesi ve atomik gereksinim
- BOM/kitlist satırı, SKU/feature code ve adet kontrolü
- Ürün seçimi ve model kararı
- Aynı segment rakip ve proje özelindeki farklılaştırıcılar
- Mevcut metin, gerekçe ve önerilen metinle değişiklik talebi
- Kısa kabul veya pozitif wording modunda şartname cevabı
- Ek maliyet, yüklenici sorumluluğu ve teknik/ticari risk
- Üretici sorusu, teyit ihtiyacı ve açık aksiyon

Her kayıtta platform desteği, teklife dahil olma, konfigürasyon uyumu ve lisans/servis hakkı ayrı kanıt alanlarıdır. Durumlar `Uygun`, `Şartlı Uygun`, `Uygun Değil - Değişiklik Gerekli`, `Teyit / Netleştirme` ve `Kapsam Dışı` standardını kullanır. Olasılık, etki ve kanıt açığından risk puanı hesaplanır. Dosya ve kayıt hatırlatmaları Windows bildirimi olarak gönderilir; **JSON dışa aktar** işlemi dosyanın tüm alanlarını ve kayıtlarını yerel bir çıktıya alır.

Dosya kontrol odası ayrıca fırsat türü, öncelik, para birimi, tahmini teklif bedeli, yaklaşık maliyet, marj, kazanma olasılığı, müşteri termini ve daha erken bir iç kalite terminini izler. **Karar hazırlığı** bölümü ölçülebilir değer, ekonomik karar verici, karar kriterleri/süreci, satın alma süreci, ihtiyaç etkisi, iç destekçi ve rekabet başlıklarını ayrı ayrı doğrular. **Paydaş haritası** etki ve tutumu; **Proje aksiyonları** sorumlu, durum, öncelik, iç termin ve hatırlatmayı saklar.

**Aksiyon Merkezi**, açık presales dosyalarındaki kritik riskleri, uygunsuzlukları, teyitleri, yeterlilik engellerini, yaklaşan müşteri terminlerini ve geciken iç aksiyonları tek öncelik kuyruğunda toplar. Portföy ekranı para birimlerini karıştırmadan toplam ve olasılıkla ağırlıklandırılmış pipeline değerlerini gösterir.

Bu iş akışı; [APMP Winning Business Ecosystem](https://apmp.org/Web/Web/About-Us/Winning-Business-Ecosystem.aspx) içindeki bid/no-bid, compliance matrix ve aşamalı review yaklaşımını; [Salesforce Opportunity Management](https://trailhead.salesforce.com/content/learn/modules/leads_opportunities_lightning_experience/work-your-opportunities) içindeki aşama, olasılık, kapanış tarihi ve contact role görünürlüğünü; [MEDDPICC](https://meddicc.com/meddpicc-sales-methodology-and-process) yeterlilik boyutlarını yerel ve tek kullanıcılı bir presales çalışma biçimine uyarlar.

## Klavye kısayolları

| Tuş | İşlem |
| --- | --- |
| `n` | Hızlı eklemeye geç |
| `/` | Aramaya geç |
| `x` | Seçili işi tamamla |
| `j` / `k` veya oklar | İşler arasında gezin |
| `g` | Görünüm panelini aç |
| `Ctrl` + `+` / `-` | Arayüz ölçeğini büyüt / küçült |
| `Ctrl` + `0` | Arayüz ölçeğini `%100` yap |
| `Esc` | Aktif alandan çık |

## Görünümü kişiselleştirme

Üst çubuktaki **Görünüm** düğmesini veya `g` kısayolunu kullanın. Atlas, Orman, Lavanta ve Kehribar paletleri; Modern, Humanist, Editoryal ve Teknik font setleri arasından seçim yapabilirsiniz. Arayüz ölçeği `%80-%160` arasında ayarlanabilir; özellikle 4K ekranlarda metinler ve kontroller birlikte büyür. Hareket ayarı sistem tercihini izleyebilir, akıcı geçişleri zorlayabilir veya animasyonları kapatabilir; seçim paneldeki canlı önizlemede hemen görülür.

Bu tercihler görevlerle aynı yerel SQLite veritabanında tutulur; dış servise gönderilmez ve masaüstü uygulamasında yeniden başlatma sonrasında korunur. Logo dosyaları ve kullanım notları [`public/brand`](public/brand/README.md) klasöründedir.

## Terminal komutu

Kaynak kurulumunda bir kez:

```sh
npm link
```

Sonrasında herhangi bir klasörden:

```sh
t add "Raporu yarın 16:00 gönder #finans p2"
```

Komut web uygulamasıyla aynı `.env` ve SQLite dosyasını kullanır. Global bağlantıyı kaldırmak için `npm unlink -g gerit` çalıştırın.

## ntfy telefon bildirimleri

1. Telefona [ntfy Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) veya [ntfy iOS](https://apps.apple.com/app/ntfy/id1625396347) uygulamasını kurun.
2. Uzun ve tahmin edilmesi zor bir konu adına abone olun.
3. `npm run setup` çalıştırın veya `.env.example` dosyasını `.env` olarak kopyalayın.
4. `.env` içindeki konu adını yazın:

   ```dotenv
   NTFY_TOPIC=uzun-ve-gizli-konu-adiniz
   ```

5. Gerit'i yeniden başlatın.

Masaüstü uygulamasında üst bardaki **Dene** düğmesiyle yerel bildirimi kontrol edebilirsiniz. Gerit açıkken her dakika görev, presales dosyası, analiz kaydı ve proje aksiyonu hatırlatmalarını kontrol eder. Bildirime tıklamak ilgili kaydı açar. **Aksiyon Merkezi** üzerinden günlük özet saati, presales kapsamı ve sessiz saatler ayarlanabilir; sessiz saatte gelen uyarı kaybolmaz, çalışma penceresi açılınca gönderilir.

Node.js/web kurulumunda telefon bildirimi için Gerit ntfy kullanır. Bir işin özel hatırlatma zamanı ayrıntı ekranından seçilir ve son tarihten önce olmalıdır. Saat dilimini `APP_TIMEZONE`, sunucuyu `NTFY_SERVER` belirler. Herkese açık `ntfy.sh` kullanıyorsanız konu adını parola gibi koruyun.

## Veriniz nerede?

Windows masaüstü kurulumunda varsayılan dosya:

```text
%APPDATA%\Gerit\data\tasks.sqlite3
```

Bu klasör her Windows kullanıcısı için ayrıdır. Görevler, çalışma notları, presales dosyaları, çoklu ürün satırları, yeterlilik değerlendirmeleri, paydaşlar, proje aksiyonları, analiz/kanıt kayıtları, bildirim düzeni ve görünüm tercihleri aynı SQLite dosyasında kalıcıdır. Eski veriler yeni sürüm ilk açıldığında otomatik olarak genişletilmiş şemaya taşınır. Gerit masaüstü sürümü bu verileri buluta göndermez; bildirimler Windows tarafından yerel olarak gösterilir.

Node.js kurulumunda varsayılan dosya:

```text
data/tasks.sqlite3
```

`DATABASE_PATH` ile başka bir konum seçebilirsiniz. Docker kurulumunda veriler `gerit_gerit-data` adlı kalıcı volume içindeki `/app/data/tasks.sqlite3` dosyasındadır:

```sh
docker volume inspect gerit_gerit-data
```

Docker'da güvenli bir SQLite yedeği oluşturmak için:

```sh
docker compose exec gerit sh -c 'sqlite3 /app/data/tasks.sqlite3 ".backup /app/data/tasks-backup.sqlite3"'
docker compose cp gerit:/app/data/tasks-backup.sqlite3 ./tasks-backup.sqlite3
```

Yedekleri aynı makine dışında da saklayın ve geri yükleme işlemini düzenli olarak deneyin.

## Güvenlik ve ağ sınırı

Gerit'te kullanıcı hesabı yoktur. Varsayılan `HOST=127.0.0.1` ayarı uygulamayı yalnızca aynı bilgisayara açar. Uzak erişim gerekiyorsa Gerit portunu doğrudan internete açmayın; HTTPS ve kimlik doğrulama sağlayan bir ters vekil ile şirket VPN'i arkasında kullanın.

VM kurulumu uygulama son hâline yaklaştığında yapılacaktır. Baştan sona Ubuntu, systemd, Nginx, HTTPS, Basic Auth, UFW, güncelleme, geri dönüş ve otomatik yedek adımları şimdiden [Linux VM kılavuzunda](docs/LINUX_VM_KURULUMU.md) tutuluyor.

## Test ve kalite

```sh
npm test
npm run check
```

GitHub Actions her push ve pull request'te testleri çalıştırır. `v*` etiketi gönderildiğinde Windows ve Linux paketleri oluşturulup GitHub Releases'a eklenir. Kullanıcıyı etkileyen değişiklikler [CHANGELOG.md](CHANGELOG.md) içinde sürümle birlikte güncellenir.

## Katkı

Hata bildirimleri ve pull request'ler açıktır. Başlamadan önce [katkı rehberini](CONTRIBUTING.md), [davranış kurallarını](CODE_OF_CONDUCT.md) ve hassas raporlar için [güvenlik politikasını](SECURITY.md) okuyun.

Gerit [MIT Lisansı](LICENSE) ile yayımlanır.

## Bilinçli kapsam sınırı

Gerit tek kullanıcı ve yerel veri için tasarlanır. İş birliği, hesap sistemi, yerel mobil uygulama ve çevrimdışı eşitleme kapsam dışıdır. Telefona erişim ntfy bildirimleriyle sağlanır; bu bilinçli bir sadelik ve veri sahipliği tercihidir.

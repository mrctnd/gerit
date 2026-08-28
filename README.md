# Gerit

<p align="center">
  <img src="public/brand/gerit-mark.png" alt="Gerit logosu" width="116">
</p>

[Türkçe](README.md) · [English](README.en.md)

[![Test](https://github.com/mrctnd/gerit/actions/workflows/ci.yml/badge.svg)](https://github.com/mrctnd/gerit/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/mrctnd/gerit?display_name=tag)](https://github.com/mrctnd/gerit/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-2563eb.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-3c873a.svg)](https://nodejs.org/)

**Gerit**, işlerini hızlıca yakalayıp yerine getirmen için tasarlanmış Türkçe, klavye odaklı ve yerel öncelikli kişisel görev yöneticisidir. Hesap, telemetri, reklam, iş birliği veya çevrimdışı eşitleme yoktur. Bütün veriniz yedekleyebileceğiniz tek bir SQLite dosyasında kalır.

Adı Latince *gerere* kökünden gelir: “yürütmek, yerine getirmek”.

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
- Dört renk paleti, dört yerel font seti ve cihazda saklanan görünüm tercihleri
- Butonlarda, görev tamamlamada ve görünüm panelinde ölçülü mikro etkileşimler; azaltılmış hareket modu
- Masaüstünde yerel Windows bildirimi; isteğe bağlı olarak ntfy ile telefon bildirimi
- Her terminalden `t add "..."` ile hızlı yakalama
- Express + EJS + yerleşik `node:sqlite`; istemci çerçevesi ve bulut hesabı yok

## En kolay kurulum: Windows masaüstü uygulaması

[Releases](https://github.com/mrctnd/gerit/releases) sayfasından `Gerit-Setup-<sürüm>-x64.exe` dosyasını indirin ve kurulumu çalıştırın. Başlat menüsü veya masaüstündeki **Gerit** kısayolundan açabilirsiniz.

- Node.js, Docker, hesap veya internet bağlantısı gerekmez.
- Uygulama yalnızca kendi bilgisayarınızdaki `127.0.0.1` adresini kullanır; yerel ağa açılmaz.
- Görevler ve görünüm tercihleri `%APPDATA%\\Gerit\\data\\tasks.sqlite3` dosyasında tutulur ve başka bir bilgisayara gönderilmez.
- Masaüstü sürümünde hatırlatmalar ve günlük özet Windows bildirimi olarak yerel gönderilir.
- Kaldırma işlemi veri dosyasını silmez. Yeniden kurduğunuzda görevleriniz kaldığı yerden açılır.
- Kurulum paketi henüz kod imzalı değilse Windows SmartScreen ilk çalıştırmada yayıncı uyarısı gösterebilir.

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

## Linux arşiv paketi

[Releases](https://github.com/mrctnd/gerit/releases) sayfasındaki Linux paketini indirin ve arşivi açın. Node.js 22.13+ kurulu olmalıdır.

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

## Klavye kısayolları

| Tuş | İşlem |
| --- | --- |
| `n` | Hızlı eklemeye geç |
| `/` | Aramaya geç |
| `x` | Seçili işi tamamla |
| `j` / `k` veya oklar | İşler arasında gezin |
| `g` | Görünüm panelini aç |
| `Esc` | Aktif alandan çık |

## Görünümü kişiselleştirme

Üst çubuktaki **Görünüm** düğmesini veya `g` kısayolunu kullanın. Atlas, Orman, Lavanta ve Kehribar paletleri; Modern, Humanist, Editoryal ve Teknik font setleri arasından seçim yapabilirsiniz. Hareket ayarı sistem tercihini izleyebilir, akıcı geçişleri zorlayabilir veya animasyonları sakinleştirebilir.

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

Masaüstü uygulamasında üst bardaki **Dene** düğmesiyle yerel bildirimi kontrol edebilirsiniz. Gerit açıkken her dakika özel hatırlatmaları ve son tarihi gelen işleri kontrol eder; saat 07:00'de günün listesini gönderir. Uygulamayı 07:00'den sonra açarsanız günlük özet o gün yalnızca bir kez gönderilir.

Node.js/web kurulumunda telefon bildirimi için Gerit ntfy kullanır. Bir işin özel hatırlatma zamanı ayrıntı ekranından seçilir ve son tarihten önce olmalıdır. Saat dilimini `APP_TIMEZONE`, sunucuyu `NTFY_SERVER` belirler. Herkese açık `ntfy.sh` kullanıyorsanız konu adını parola gibi koruyun.

## Veriniz nerede?

Windows masaüstü kurulumunda varsayılan dosya:

```text
%APPDATA%\Gerit\data\tasks.sqlite3
```

Bu klasör her Windows kullanıcısı için ayrıdır. Görevler, çalışma notları, hatırlatma durumları ve görünüm tercihleri aynı SQLite dosyasında kalıcıdır. Gerit masaüstü sürümü görevleri buluta göndermez; bildirimler Windows tarafından yerel olarak gösterilir.

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

# TodoSlate

TodoSlate, iş gününü hızlı ve sakin tutmak için geliştirilmiş Türkçe, klavye odaklı kişisel iş yöneticisidir. Hesap, telemetri, iş birliği veya çevrimdışı eşitleme içermez; tüm görev geçmişi tek bir SQLite dosyasında kalır.

## Öne çıkanlar

- `n` ile hızlı ekleme, `x` ile tamamlama, `/` ile arama
- Türkçe doğal tarih: `yarın 16:00`, `cuma 09:30`, `25.08.2026 14:00`
- Tek satırda proje ve öncelik: `#finans p1`
- Türkçe tekrarlar: `her pazartesi,perşembe`, `her ayın 1’i`, `her iş günü`
- Bugün, Yaklaşan, Gelen Kutusu, proje ve Tamamlananlar görünümleri
- Geciken işler, günlük iş özeti ve tamamlanma sayacı
- Tamamlanan işi yeniden açma ve açık işi kopyalama
- Her iş için serbest metin notları
- Dakikalık ntfy hatırlatmaları ve 07:00 günlük özeti
- Herhangi bir terminalden `t add "..."` ile kayıt
- Nginx, systemd, HTTPS ve otomatik SQLite yedekleriyle Linux VM dağıtım dosyaları

## Yerelde başlatma

Node.js 22 veya daha yenisi gerekir.

```sh
npm install
npm start
```

Ardından [http://127.0.0.1:3030](http://127.0.0.1:3030) adresini açın. Uygulama güvenlik gereği yalnızca `127.0.0.1` adresini dinler.

Kod üzerinde çalışırken otomatik yeniden başlatma için:

```sh
npm run dev
```

## Hızlı ekleme örnekleri

```text
Müşteri teklifini yarın 16:00 gönder #satış p1
Haftalık raporu cuma 10:30 hazırla #yönetim p2
Operasyon toplantısı her pazartesi,perşembe 09:00 #operasyon p2
Faturaları her ayın 1’i kontrol et #finans p1
```

- `#proje` işi bir projeye bağlar.
- `p1`, `p2`, `p3` öncelik belirler.
- Tarih verilmezse iş Gelen Kutusu'na düşer.
- Bir işi açarak not, tarih, proje, öncelik veya RRULE düzenlenebilir.
- Tekrarlanan bir iş tamamlandığında sıradaki tekrar otomatik oluşturulur.

## Klavye kısayolları

| Tuş | İşlem |
| --- | --- |
| `n` | Hızlı eklemeye geç |
| `/` | Aramaya geç |
| `x` | Seçili işi tamamla |
| `j` / `k` veya oklar | İşler arasında gezin |
| `Esc` | Aktif alandan çık |

## Terminal komutu

Bu klasörde bir kez:

```sh
npm link
```

Sonrasında herhangi bir klasörden:

```sh
t add "Raporu yarın 16:00 gönder #finans p2"
```

Komut `.env` içindeki veritabanı yolunu kullanır ve web uygulaması kapalıyken de çalışır. Global bağlantıyı kaldırmak için `npm unlink -g todoslate` çalıştırılabilir.

## ntfy telefon bildirimleri

1. Telefona ntfy uygulamasını kurun.
2. Uzun ve tahmin edilemez bir konu adına abone olun.
3. `.env.example` dosyasını `.env` adıyla kopyalayın.
4. `.env` içinde aynı konuyu yazın:

   ```dotenv
   NTFY_TOPIC=uzun-ve-gizli-konu-adiniz
   ```

5. TodoSlate'i yeniden başlatın.

Uygulama her dakika zamanı gelen işleri kontrol eder ve saat 07:00'de günün özetini gönderir. Saat dilimi `APP_TIMEZONE` ile belirlenir. Varsayılan ntfy sunucusu `https://ntfy.sh` adresidir; konu adını bir parola gibi koruyun.

## Veritabanı ve yedek

Yerel varsayılan veritabanı:

```text
data/tasks.sqlite3
```

Kalıcı bütün görev verisi bu dosyadadır. `DATABASE_PATH` ile başka bir konum seçilebilir. Yerel elle yedek alırken uygulamayı durdurup dosyayı kopyalamak en güvenli yöntemdir.

## Linux VM kurulumu

Boş Ubuntu Server VM oluşturma, SSH sertleştirme, Node.js, GitHub Deploy Key, systemd, Nginx, HTTPS, Basic Auth, UFW, otomatik yedek, güncelleme ve geri dönüş adımlarının tamamı burada:

**[Linux VM kurulum kılavuzu](docs/LINUX_VM_KURULUMU.md)**

Hazır üretim dosyaları `deploy/` klasöründedir:

- `todoslate.service`: sertleştirilmiş systemd servisi
- `nginx.conf`: localhost ters vekili ve Basic Auth
- `backup.sh`: bütünlük kontrollü SQLite yedeği
- `todoslate-backup.service` ve `.timer`: günlük otomatik yedek

## Test

```sh
npm test
```

Testler Türkçe ve İngilizce hızlı ekleme, tekrar kuralları, sunucu görünümleri, tamamlama/yeniden açma, arama, hatırlatıcılar, sağlık kontrolü ve yalnızca localhost bağlanmasını doğrular.

## GitHub'a ilk gönderim

Bu proje kendi Git deposu olarak hazırlanmıştır. GitHub'da boş bir `todoslate` deposu oluşturduktan sonra:

```sh
git remote add origin git@github.com:GITHUB_KULLANICISI/todoslate.git
git push -u origin main
```

`.env` ve SQLite veritabanı `.gitignore` ile dışarıda tutulur; gizli ntfy konusu GitHub'a gitmez.

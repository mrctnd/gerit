# Gerit'i şirket sunucusunda barındırma kılavuzu

> **Durum:** Bu belge üretim hazırlığı için tutulur. Uygulama son kararlı seviyesine gelmeden şirket VM'inde kurulum yapmayın; sürüm sabitlendiğinde adımları güncel sürüm etiketiyle uygulayın.

Bu kılavuz, boş bir Ubuntu Server sanal makinesinden başlayarak Gerit'i şirket içinde güvenli biçimde yayınlar. Son mimari şöyledir:

```text
Tarayıcı
   │ HTTPS + parola
   ▼
Nginx :443
   │ yalnızca 127.0.0.1 üzerinden
   ▼
Gerit :3030 ─── SQLite /var/lib/gerit/tasks.sqlite3
```

Gerit uygulamasında kullanıcı hesabı yoktur. Sunucudaki erişim korumasını Nginx Basic Auth ve şirket ağı/VPN kısıtı sağlar. Basic Auth parolası yalnızca HTTPS ile güvenlidir; uygulamayı düz HTTP üzerinden kullanmayın.

Komutlardaki şu örnekleri kendi bilgilerinizle değiştirin:

- `192.0.2.40`: sanal makinenin sabit IP adresi
- `10.20.0.0/16`: şirket ağı veya VPN CIDR bloğu
- `tasks.sirketiniz.com`: kullanacağınız tam alan adı
- `mrctnd/gerit`: GitHub depo yolu
- `yonetici`: Ubuntu yönetici kullanıcı adı

## 1. Sanal makineyi oluşturun

Hyper-V, VMware, Proxmox veya kullandığınız başka bir sanallaştırma platformunda yeni bir VM açın:

| Kaynak | Önerilen başlangıç |
| --- | --- |
| İşletim sistemi | Ubuntu Server 24.04 LTS, 64 bit |
| İşlemci | 2 vCPU |
| Bellek | 2 GB RAM |
| Disk | 20 GB, thin provision olabilir |
| Ağ | Şirket sunucu VLAN'ı; mümkünse sabit IP/DHCP rezervasyonu |

Ubuntu ISO'sunu bağlayıp kurulumu başlatın. Kurulum sırasında:

1. Sunucu adını `gerit-vm` yapın.
2. Güçlü bir yönetici hesabı oluşturun.
3. **Install OpenSSH server** seçeneğini işaretleyin.
4. Docker, Kubernetes veya başka ek paket seçmeyin.
5. Kurulum bitince ISO'yu çıkarıp VM'yi yeniden başlatın.

Sanal makineye konsoldan giriş yapın ve IP adresini öğrenin:

```bash
ip -brief address
```

DNS yöneticinizden `tasks.sirketiniz.com` kaydını bu IP'ye yönlendirmesini isteyin. Uygulama yalnızca şirket içinde çalışacaksa iç DNS kaydı yeterlidir.

## 2. SSH anahtarıyla güvenli erişimi kurun

Windows bilgisayarınızda PowerShell açın:

```powershell
ssh-keygen -t ed25519 -C "gerit-yönetim"
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | ssh yonetici@192.0.2.40 "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
ssh yonetici@192.0.2.40
```

Yeni bir PowerShell penceresinde anahtarla giriş yapabildiğinizi doğrulamadan parola girişini kapatmayın. Doğruladıktan sonra VM üzerinde:

```bash
sudo tee /etc/ssh/sshd_config.d/99-gerit-hardening.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
EOF

sudo sshd -t
sudo systemctl restart ssh
```

Mevcut SSH oturumunu kapatmadan ikinci bir terminalden tekrar bağlanın. Bağlantı başarısızsa ilk oturumdan yapılandırmayı düzeltin.

## 3. Sistemi güncelleyin ve temel paketleri kurun

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y git curl ca-certificates gnupg build-essential nginx sqlite3 apache2-utils ufw unattended-upgrades
sudo timedatectl set-timezone Europe/Istanbul
```

VM bir yeniden başlatma istiyorsa:

```bash
test -f /var/run/reboot-required && sudo reboot
```

## 4. Güvenlik duvarını açın

Önce SSH'ı yalnızca yönetim ağından açın. `10.20.0.0/16` değerini şirketinizin gerçek ağıyla değiştirin:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 10.20.0.0/16 to any port 22 proto tcp
sudo ufw allow from 10.20.0.0/16 to any port 80 proto tcp
sudo ufw allow from 10.20.0.0/16 to any port 443 proto tcp
sudo ufw enable
sudo ufw status numbered
```

Let's Encrypt kullanacaksanız sertifika alınırken 80 ve 443 portlarının internetten erişilebilir olması gerekebilir. Bu durumda şirket politikanıza uygun şekilde geçici veya kalıcı `Nginx Full` kuralı kullanın:

```bash
sudo ufw allow 'Nginx Full'
```

`3030` portunu UFW'de asla açmayın. Gerit o portta yalnızca `127.0.0.1` adresini dinler.

## 5. Node.js 24'ü kurun

NodeSource'un Ubuntu/Debian kurulum betiğini indirip çalıştırın, ardından Node paketini kurun:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node --version
npm --version
```

`node --version` çıktısı `v24...` olmalıdır. `better-sqlite3` için hazır ikili bulunamazsa kurduğumuz `build-essential` paketi yerel derlemeyi karşılar.

## 6. Gerit sistem kullanıcısını ve dizinlerini oluşturun

```bash
sudo useradd --system --create-home --home-dir /opt/gerit --shell /usr/sbin/nologin gerit
sudo mkdir -p /opt/gerit /var/lib/gerit /var/backups/gerit /etc/gerit
sudo chown -R gerit:gerit /opt/gerit /var/lib/gerit /var/backups/gerit
sudo chmod 750 /opt/gerit /var/lib/gerit /var/backups/gerit
sudo chmod 750 /etc/gerit
```

Uygulama kodu `/opt/gerit/current`, veriler `/var/lib/gerit`, gizli ayarlar `/etc/gerit` altında tutulur. Böylece kod güncellemesi veritabanına dokunmaz.

## 7. GitHub deposu için salt okunur Deploy Key oluşturun

VM üzerinde Gerit kullanıcısına özel anahtar oluşturun:

```bash
sudo -u gerit mkdir -p /opt/gerit/.ssh
sudo -u gerit chmod 700 /opt/gerit/.ssh
sudo -u gerit ssh-keygen -t ed25519 -N '' -C 'gerit-production' -f /opt/gerit/.ssh/github_deploy
sudo cat /opt/gerit/.ssh/github_deploy.pub
```

Çıktıyı kopyalayın. GitHub'da Gerit deposunu açın:

1. **Settings → Deploy keys → Add deploy key** yoluna gidin.
2. Başlığa `Gerit Production VM` yazın.
3. Anahtarı yapıştırın.
4. **Allow write access** seçeneğini işaretlemeyin.

VM'de SSH yapılandırmasını oluşturun:

```bash
sudo -u gerit tee /opt/gerit/.ssh/config >/dev/null <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile /opt/gerit/.ssh/github_deploy
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF

sudo -u gerit chmod 600 /opt/gerit/.ssh/config
sudo -u gerit ssh -T git@github.com
```

GitHub “shell access sağlamıyoruz” benzeri bir mesaj döndürür; bu normaldir.

## 8. Kodu sunucuya alın ve üretim bağımlılıklarını kurun

Depo yolunu değiştirerek:

```bash
sudo -u gerit git clone git@github.com:mrctnd/gerit.git /opt/gerit/current
cd /opt/gerit/current
sudo -u gerit npm ci --omit=dev
```

## 9. Üretim ortam ayarlarını oluşturun

```bash
sudo install -m 640 -o root -g gerit /dev/null /etc/gerit/gerit.env
sudo nano /etc/gerit/gerit.env
```

Dosyaya şunları yazın:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3030
APP_TIMEZONE=Europe/Istanbul
DATABASE_PATH=/var/lib/gerit/tasks.sqlite3
NTFY_TOPIC=uzun-ve-tahmin-edilemez-ntfy-konu-adiniz
NTFY_SERVER=https://ntfy.sh
```

`NTFY_TOPIC` boş bırakılırsa telefon bildirimleri kapanır. Bu dosyayı Git'e eklemeyin.

## 10. systemd servisini kurun

```bash
cd /opt/gerit/current
sudo cp deploy/gerit.service /etc/systemd/system/gerit.service
sudo systemctl daemon-reload
sudo systemctl enable --now gerit.service
sudo systemctl status gerit.service --no-pager
curl --fail http://127.0.0.1:3030/healthz
```

Son komut `{"status":"ok",...}` döndürmelidir. Hata durumunda logları açın:

```bash
sudo journalctl -u gerit.service -n 100 --no-pager
```

## 11. Nginx ters vekilini ve parolayı kurun

Önce erişim parolasını oluşturun. `gerit-user` yerine istediğiniz kullanıcı adını yazın:

```bash
sudo htpasswd -c /etc/nginx/gerit.htpasswd gerit-user
sudo chmod 640 /etc/nginx/gerit.htpasswd
sudo chown root:www-data /etc/nginx/gerit.htpasswd
```

Nginx şablonunu kurup alan adını değiştirin:

```bash
cd /opt/gerit/current
sudo cp deploy/nginx.conf /etc/nginx/sites-available/gerit
sudo sed -i 's/tasks\.sirketiniz\.local/tasks.sirketiniz.com/g' /etc/nginx/sites-available/gerit
sudo ln -s /etc/nginx/sites-available/gerit /etc/nginx/sites-enabled/gerit
sudo unlink /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl reload nginx
```

Şimdilik uygulamaya yalnızca sertifika hazırlığı için HTTP üzerinden erişilebilir. Parolayı düz HTTP bağlantısında kullanmayın; hemen sonraki HTTPS adımını tamamlayın.

## 12. HTTPS sertifikasını kurun

### Seçenek A — İnternetten çözülen alan adı ve Let's Encrypt

DNS kaydı bu VM'ye yönleniyor, 80/443 portları internete açık ve şirket politikanız izin veriyorsa:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d tasks.sirketiniz.com
sudo certbot renew --dry-run
```

Certbot Nginx'e TLS yapılandırmasını ve HTTP→HTTPS yönlendirmesini ekler. Tarayıcıda `https://tasks.sirketiniz.com` adresini açıp kilit simgesini kontrol edin.

### Seçenek B — Yalnızca şirket içi DNS

İç alan adı internetten doğrulanamıyorsa şirketinizin iç sertifika otoritesinden sertifika alın. Sertifika ve özel anahtarı örneğin şu konumlara koyun:

```text
/etc/ssl/certs/gerit.crt
/etc/ssl/private/gerit.key
```

`/etc/nginx/sites-available/gerit` dosyasındaki sunucu bloğunu 443 için düzenleyin:

```nginx
listen 443 ssl;
listen [::]:443 ssl;
ssl_certificate /etc/ssl/certs/gerit.crt;
ssl_certificate_key /etc/ssl/private/gerit.key;
ssl_protocols TLSv1.2 TLSv1.3;
add_header Strict-Transport-Security "max-age=31536000" always;
```

Ayrıca ayrı bir 80 portu bloğuyla HTTPS'e yönlendirin:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tasks.sirketiniz.com;
    return 301 https://$host$request_uri;
}
```

Son olarak:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Şirket bilgisayarlarında iç sertifika otoritesinin kök sertifikası güvenilir olmalıdır; aksi halde tarayıcı sertifika uyarısı gösterir.

## 13. Otomatik SQLite yedeklerini etkinleştirin

Gerit çalışırken güvenli yedek almak için SQLite'ın `.backup` komutu kullanılır:

```bash
cd /opt/gerit/current
sudo install -m 0750 -o root -g gerit deploy/backup.sh /usr/local/sbin/gerit-backup
sudo cp deploy/gerit-backup.service /etc/systemd/system/
sudo cp deploy/gerit-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gerit-backup.timer
sudo systemctl start gerit-backup.service
sudo systemctl status gerit-backup.service --no-pager
sudo systemctl list-timers gerit-backup.timer
sudo -u gerit ls -lh /var/backups/gerit
```

Her gece yaklaşık 02:30'da bütünlük kontrolünden geçmiş sıkıştırılmış bir yedek alınır. 30 günden eski otomatik yedekler silinir. Şirketinizin yedekleme sistemine `/var/backups/gerit` dizinini ayrıca dahil edin; aynı VM üzerindeki tek kopya felaket yedeği değildir.

### Yedekten geri dönme

Önce uygulamayı durdurun ve mevcut veritabanını koruyun:

```bash
sudo systemctl stop gerit
sudo cp -a /var/lib/gerit/tasks.sqlite3 /var/lib/gerit/tasks.pre-restore.sqlite3
gzip -dc /var/backups/gerit/gerit-YYYYMMDDTHHMMSSZ.sqlite3.gz | sudo tee /var/lib/gerit/tasks.restore.sqlite3 >/dev/null
sudo chown gerit:gerit /var/lib/gerit/tasks.restore.sqlite3
sudo chmod 600 /var/lib/gerit/tasks.restore.sqlite3
sudo -u gerit sqlite3 /var/lib/gerit/tasks.restore.sqlite3 'PRAGMA quick_check;'
```

Kontrol `ok` döndürürse:

```bash
sudo mv /var/lib/gerit/tasks.restore.sqlite3 /var/lib/gerit/tasks.sqlite3
sudo chown gerit:gerit /var/lib/gerit/tasks.sqlite3
sudo chmod 600 /var/lib/gerit/tasks.sqlite3
sudo systemctl start gerit
curl --fail http://127.0.0.1:3030/healthz
```

## 14. Yeni sürüm yayınlama

GitHub'a gönderdiğiniz yeni sürümü VM'ye almak için:

```bash
sudo systemctl start gerit-backup.service
sudo systemctl stop gerit
cd /opt/gerit/current
sudo -u gerit git fetch --prune origin
sudo -u gerit git checkout main
sudo -u gerit git pull --ff-only origin main
sudo -u gerit npm ci --omit=dev
sudo systemctl start gerit
curl --fail http://127.0.0.1:3030/healthz
sudo journalctl -u gerit.service -n 50 --no-pager
```

Bir sürüm sorun çıkarırsa `git log --oneline` ile önceki çalışan commit'i bulun:

```bash
sudo systemctl stop gerit
cd /opt/gerit/current
sudo -u gerit git checkout ESKI_COMMIT_KIMLIGI
sudo -u gerit npm ci --omit=dev
sudo systemctl start gerit
```

Sorun çözüldükten sonra tekrar `main` dalına dönün.

## 15. İşletim ve sorun giderme

```bash
# Uygulama durumu
sudo systemctl status gerit --no-pager

# Canlı uygulama logu
sudo journalctl -u gerit -f

# Nginx yapılandırma kontrolü
sudo nginx -t

# Yerel sağlık kontrolü
curl --fail http://127.0.0.1:3030/healthz

# Disk kullanımı
df -h
du -sh /var/lib/gerit /var/backups/gerit

# Zamanlayıcılar
systemctl list-timers --all | grep gerit
```

### VM üzerinde terminalden iş ekleme

```bash
sudo -u gerit bash -c 'set -a; source /etc/gerit/gerit.env; cd /opt/gerit/current; node bin/t.js add "$1"' _ "Raporu yarın 16:00 gönder #finans p2"
```

### Son güvenlik kontrol listesi

- [ ] 3030 portu dış ağa açık değil.
- [ ] Uygulama yalnızca HTTPS ile kullanılıyor.
- [ ] Nginx Basic Auth parolası güçlü ve benzersiz.
- [ ] SSH parola girişi kapalı; kök kullanıcıyla giriş kapalı.
- [ ] UFW yalnızca şirket ağı/VPN için gerekli portları açıyor.
- [ ] `/etc/gerit/gerit.env` Git'te yok ve yalnızca root/gerit okuyabiliyor.
- [ ] Günlük yedek oluşuyor ve ayrı bir fiziksel sisteme kopyalanıyor.
- [ ] `sudo apt update && sudo apt upgrade` düzenli uygulanıyor.
- [ ] Yedekten geri dönme işlemi en az bir kez test edildi.

## Resmî başvuru kaynakları

- [Ubuntu OpenSSH Server](https://ubuntu.com/server/docs/how-to/security/openssh-server/)
- [Ubuntu UFW güvenlik duvarı](https://ubuntu.com/server/docs/security-firewall/)
- [Ubuntu Nginx kurulumu](https://ubuntu.com/server/docs/how-to/web-services/install-nginx/)
- [NodeSource Node.js 24 Debian/Ubuntu betiği](https://github.com/nodesource/distributions/blob/master/scripts/deb/setup_24.x)
- [GitHub Deploy Keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
- [Nginx reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy)
- [Nginx Basic Auth](https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/)
- [Certbot + Nginx](https://certbot.eff.org/instructions?ws=nginx&os=snap)
- [SQLite komut satırı ve `.backup`](https://www.sqlite.org/cli.html)

# TodoSlate'i şirket sunucusunda barındırma kılavuzu

Bu kılavuz, boş bir Ubuntu Server sanal makinesinden başlayarak TodoSlate'i şirket içinde güvenli biçimde yayınlar. Son mimari şöyledir:

```text
Tarayıcı
   │ HTTPS + parola
   ▼
Nginx :443
   │ yalnızca 127.0.0.1 üzerinden
   ▼
TodoSlate :3030 ─── SQLite /var/lib/todoslate/tasks.sqlite3
```

TodoSlate uygulamasında kullanıcı hesabı yoktur. Sunucudaki erişim korumasını Nginx Basic Auth ve şirket ağı/VPN kısıtı sağlar. Basic Auth parolası yalnızca HTTPS ile güvenlidir; uygulamayı düz HTTP üzerinden kullanmayın.

Komutlardaki şu örnekleri kendi bilgilerinizle değiştirin:

- `192.0.2.40`: sanal makinenin sabit IP adresi
- `10.20.0.0/16`: şirket ağı veya VPN CIDR bloğu
- `tasks.sirketiniz.com`: kullanacağınız tam alan adı
- `GITHUB_KULLANICISI/todoslate`: GitHub depo yolu
- `bugra`: Ubuntu yönetici kullanıcı adı

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

1. Sunucu adını `todoslate-vm` yapın.
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
ssh-keygen -t ed25519 -C "todoslate-yönetim"
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | ssh bugra@192.0.2.40 "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
ssh bugra@192.0.2.40
```

Yeni bir PowerShell penceresinde anahtarla giriş yapabildiğinizi doğrulamadan parola girişini kapatmayın. Doğruladıktan sonra VM üzerinde:

```bash
sudo tee /etc/ssh/sshd_config.d/99-todoslate-hardening.conf >/dev/null <<'EOF'
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

`3030` portunu UFW'de asla açmayın. TodoSlate o portta yalnızca `127.0.0.1` adresini dinler.

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

## 6. TodoSlate sistem kullanıcısını ve dizinlerini oluşturun

```bash
sudo useradd --system --create-home --home-dir /opt/todoslate --shell /usr/sbin/nologin todoslate
sudo mkdir -p /opt/todoslate /var/lib/todoslate /var/backups/todoslate /etc/todoslate
sudo chown -R todoslate:todoslate /opt/todoslate /var/lib/todoslate /var/backups/todoslate
sudo chmod 750 /opt/todoslate /var/lib/todoslate /var/backups/todoslate
sudo chmod 750 /etc/todoslate
```

Uygulama kodu `/opt/todoslate/current`, veriler `/var/lib/todoslate`, gizli ayarlar `/etc/todoslate` altında tutulur. Böylece kod güncellemesi veritabanına dokunmaz.

## 7. GitHub deposu için salt okunur Deploy Key oluşturun

VM üzerinde TodoSlate kullanıcısına özel anahtar oluşturun:

```bash
sudo -u todoslate mkdir -p /opt/todoslate/.ssh
sudo -u todoslate chmod 700 /opt/todoslate/.ssh
sudo -u todoslate ssh-keygen -t ed25519 -N '' -C 'todoslate-production' -f /opt/todoslate/.ssh/github_deploy
sudo cat /opt/todoslate/.ssh/github_deploy.pub
```

Çıktıyı kopyalayın. GitHub'da TodoSlate deposunu açın:

1. **Settings → Deploy keys → Add deploy key** yoluna gidin.
2. Başlığa `TodoSlate Production VM` yazın.
3. Anahtarı yapıştırın.
4. **Allow write access** seçeneğini işaretlemeyin.

VM'de SSH yapılandırmasını oluşturun:

```bash
sudo -u todoslate tee /opt/todoslate/.ssh/config >/dev/null <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile /opt/todoslate/.ssh/github_deploy
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF

sudo -u todoslate chmod 600 /opt/todoslate/.ssh/config
sudo -u todoslate ssh -T git@github.com
```

GitHub “shell access sağlamıyoruz” benzeri bir mesaj döndürür; bu normaldir.

## 8. Kodu sunucuya alın ve üretim bağımlılıklarını kurun

Depo yolunu değiştirerek:

```bash
sudo -u todoslate git clone git@github.com:GITHUB_KULLANICISI/todoslate.git /opt/todoslate/current
cd /opt/todoslate/current
sudo -u todoslate npm ci --omit=dev
```

## 9. Üretim ortam ayarlarını oluşturun

```bash
sudo install -m 640 -o root -g todoslate /dev/null /etc/todoslate/todoslate.env
sudo nano /etc/todoslate/todoslate.env
```

Dosyaya şunları yazın:

```dotenv
NODE_ENV=production
PORT=3030
APP_TIMEZONE=Europe/Istanbul
DATABASE_PATH=/var/lib/todoslate/tasks.sqlite3
NTFY_TOPIC=uzun-ve-tahmin-edilemez-ntfy-konu-adiniz
NTFY_SERVER=https://ntfy.sh
```

`NTFY_TOPIC` boş bırakılırsa telefon bildirimleri kapanır. Bu dosyayı Git'e eklemeyin.

## 10. systemd servisini kurun

```bash
cd /opt/todoslate/current
sudo cp deploy/todoslate.service /etc/systemd/system/todoslate.service
sudo systemctl daemon-reload
sudo systemctl enable --now todoslate.service
sudo systemctl status todoslate.service --no-pager
curl --fail http://127.0.0.1:3030/healthz
```

Son komut `{"status":"ok",...}` döndürmelidir. Hata durumunda logları açın:

```bash
sudo journalctl -u todoslate.service -n 100 --no-pager
```

## 11. Nginx ters vekilini ve parolayı kurun

Önce erişim parolasını oluşturun. `bugra` yerine istediğiniz kullanıcı adını yazın:

```bash
sudo htpasswd -c /etc/nginx/todoslate.htpasswd bugra
sudo chmod 640 /etc/nginx/todoslate.htpasswd
sudo chown root:www-data /etc/nginx/todoslate.htpasswd
```

Nginx şablonunu kurup alan adını değiştirin:

```bash
cd /opt/todoslate/current
sudo cp deploy/nginx.conf /etc/nginx/sites-available/todoslate
sudo sed -i 's/tasks\.sirketiniz\.local/tasks.sirketiniz.com/g' /etc/nginx/sites-available/todoslate
sudo ln -s /etc/nginx/sites-available/todoslate /etc/nginx/sites-enabled/todoslate
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
/etc/ssl/certs/todoslate.crt
/etc/ssl/private/todoslate.key
```

`/etc/nginx/sites-available/todoslate` dosyasındaki sunucu bloğunu 443 için düzenleyin:

```nginx
listen 443 ssl;
listen [::]:443 ssl;
ssl_certificate /etc/ssl/certs/todoslate.crt;
ssl_certificate_key /etc/ssl/private/todoslate.key;
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

TodoSlate çalışırken güvenli yedek almak için SQLite'ın `.backup` komutu kullanılır:

```bash
cd /opt/todoslate/current
sudo install -m 0750 -o root -g todoslate deploy/backup.sh /usr/local/sbin/todoslate-backup
sudo cp deploy/todoslate-backup.service /etc/systemd/system/
sudo cp deploy/todoslate-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now todoslate-backup.timer
sudo systemctl start todoslate-backup.service
sudo systemctl status todoslate-backup.service --no-pager
sudo systemctl list-timers todoslate-backup.timer
sudo -u todoslate ls -lh /var/backups/todoslate
```

Her gece yaklaşık 02:30'da bütünlük kontrolünden geçmiş sıkıştırılmış bir yedek alınır. 30 günden eski otomatik yedekler silinir. Şirketinizin yedekleme sistemine `/var/backups/todoslate` dizinini ayrıca dahil edin; aynı VM üzerindeki tek kopya felaket yedeği değildir.

### Yedekten geri dönme

Önce uygulamayı durdurun ve mevcut veritabanını koruyun:

```bash
sudo systemctl stop todoslate
sudo cp -a /var/lib/todoslate/tasks.sqlite3 /var/lib/todoslate/tasks.pre-restore.sqlite3
gzip -dc /var/backups/todoslate/todoslate-YYYYMMDDTHHMMSSZ.sqlite3.gz | sudo tee /var/lib/todoslate/tasks.restore.sqlite3 >/dev/null
sudo chown todoslate:todoslate /var/lib/todoslate/tasks.restore.sqlite3
sudo chmod 600 /var/lib/todoslate/tasks.restore.sqlite3
sudo -u todoslate sqlite3 /var/lib/todoslate/tasks.restore.sqlite3 'PRAGMA quick_check;'
```

Kontrol `ok` döndürürse:

```bash
sudo mv /var/lib/todoslate/tasks.restore.sqlite3 /var/lib/todoslate/tasks.sqlite3
sudo chown todoslate:todoslate /var/lib/todoslate/tasks.sqlite3
sudo chmod 600 /var/lib/todoslate/tasks.sqlite3
sudo systemctl start todoslate
curl --fail http://127.0.0.1:3030/healthz
```

## 14. Yeni sürüm yayınlama

GitHub'a gönderdiğiniz yeni sürümü VM'ye almak için:

```bash
sudo systemctl start todoslate-backup.service
sudo systemctl stop todoslate
cd /opt/todoslate/current
sudo -u todoslate git fetch --prune origin
sudo -u todoslate git checkout main
sudo -u todoslate git pull --ff-only origin main
sudo -u todoslate npm ci --omit=dev
sudo systemctl start todoslate
curl --fail http://127.0.0.1:3030/healthz
sudo journalctl -u todoslate.service -n 50 --no-pager
```

Bir sürüm sorun çıkarırsa `git log --oneline` ile önceki çalışan commit'i bulun:

```bash
sudo systemctl stop todoslate
cd /opt/todoslate/current
sudo -u todoslate git checkout ESKI_COMMIT_KIMLIGI
sudo -u todoslate npm ci --omit=dev
sudo systemctl start todoslate
```

Sorun çözüldükten sonra tekrar `main` dalına dönün.

## 15. İşletim ve sorun giderme

```bash
# Uygulama durumu
sudo systemctl status todoslate --no-pager

# Canlı uygulama logu
sudo journalctl -u todoslate -f

# Nginx yapılandırma kontrolü
sudo nginx -t

# Yerel sağlık kontrolü
curl --fail http://127.0.0.1:3030/healthz

# Disk kullanımı
df -h
du -sh /var/lib/todoslate /var/backups/todoslate

# Zamanlayıcılar
systemctl list-timers --all | grep todoslate
```

### VM üzerinde terminalden iş ekleme

```bash
sudo -u todoslate bash -c 'set -a; source /etc/todoslate/todoslate.env; cd /opt/todoslate/current; node bin/t.js add "$1"' _ "Raporu yarın 16:00 gönder #finans p2"
```

### Son güvenlik kontrol listesi

- [ ] 3030 portu dış ağa açık değil.
- [ ] Uygulama yalnızca HTTPS ile kullanılıyor.
- [ ] Nginx Basic Auth parolası güçlü ve benzersiz.
- [ ] SSH parola girişi kapalı; kök kullanıcıyla giriş kapalı.
- [ ] UFW yalnızca şirket ağı/VPN için gerekli portları açıyor.
- [ ] `/etc/todoslate/todoslate.env` Git'te yok ve yalnızca root/todoslate okuyabiliyor.
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

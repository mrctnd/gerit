# Gerit'e katkı

Katkılar memnuniyetle karşılanır. Küçük düzeltmeler için doğrudan pull request açabilir; daha büyük davranış değişiklikleri için önce bir özellik isteği oluşturarak yaklaşımı konuşabilirsiniz.

## Geliştirme ortamı

1. Node.js 22 veya daha yenisini kurun.
2. Depoyu fork edip klonlayın.
3. `npm ci` ve ardından `npm run setup` çalıştırın.
4. `npm run dev` ile geliştirme sunucusunu başlatın.
5. Göndermeden önce `npm test` çalıştırın.

Gerçek `.env` dosyalarını, ntfy konu adlarını ve SQLite veritabanlarını commit etmeyin.

## Commit ve pull request düzeni

- Commit mesajlarında `feat:`, `fix:`, `docs:`, `test:`, `ci:` gibi Conventional Commits türlerini kullanın.
- Her pull request tek ve anlaşılır bir değişikliğe odaklansın.
- Davranış değişiyorsa test ve belgeleri birlikte güncelleyin.
- Arayüz değişikliklerinde mümkünse önce/sonra ekran görüntüsü ekleyin.

Katkı göndererek çalışmanızın proje lisansı olan MIT altında yayımlanmasını kabul etmiş olursunuz.

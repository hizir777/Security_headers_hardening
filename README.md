<div align="center">

  # Security Headers Hardening / Güvenlik Başlıkları Sıkılaştırma

  ![GitHub](https://img.shields.io/badge/GitHub-Private-red?style=flat-square&logo=github)
  ![Language](https://img.shields.io/badge/Language-Node.js-blue?style=flat-square)
  ![Status](https://img.shields.io/badge/Status-In%20Progress-yellow?style=flat-square)
  ![Course](https://img.shields.io/badge/Course-BGT208-purple?style=flat-square)
  ![License](https://img.shields.io/badge/License-Educational-green?style=flat-square)

</div>

---

## 📑 Table of Contents / İçindekiler

- [🎓 Danışman](#-danışman)
- [👤 Öğrenci](#-öğrenci)
- [📚 Ders Bilgileri](#-ders-bilgileri)
- [📋 Proje Özeti](#-proje-özeti)
- [🗂 Repo Yapısı](#-repo-yapısı)
- [🚀 Kurulum](#-kurulum)
- [🎬 Demo](#-demo)
- [📚 Belgeleme](#-belgeleme)
- [🔗 Kaynaklar](#-kaynaklar)

---

## 🎓 Danışman

| | |
|---|---|
| **Ad** | Keyvan Arasteh |
| **GitHub** | [@keyvanarasteh](https://github.com/keyvanarasteh) |
| **Email** | [keyvan.arasteh@istinye.edu.tr](mailto:keyvan.arasteh@istinye.edu.tr) |
| **LinkedIn** | [keyvanarasteh](https://www.linkedin.com/in/keyvanarasteh/) |
| **Website** | [qline.tech](https://qline.tech) |

---

## 👤 Öğrenci

| | |
|---|---|
| **Ad Soyad** | Can Ekizoğlu |
| **Öğrenci No** | `2420191008` |

---

## 📚 Ders Bilgileri

| | |
|---|---|
| **Ders Adı** | Güvenli Web Yazılımı Geliştirme |
| **Ders Kodu** | BGT208 |
| **Kredi** | 5 ECTS |
| **Dönem** | 2025-2026 Bahar |
| **Üniversite** | [İstinye Üniversitesi](https://istinye.edu.tr) |

---

## 📋 Proje Özeti

OWASP A05:2021 — Güvenlik Yanlış Yapılandırması kapsamında, altı temel savunma amaçlı HTTP yanıt başlığını (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) sıkı bir şekilde uygulayan, üretime hazır bir **Express.js** şablonudur.

Sunucunun ürettiği her değer tek bir yapılandırma modülünden (`src/config/headers.js`) türetilir; otomatik **Jest** testleriyle doğrulanır; komut satırından (`scripts/audit-headers.sh`), CI pipeline'dan ve uygulama içi canlı `/audit` panelinden denetlenebilir.

---

## 🗂 Repo Yapısı

```
.
├── .github/workflows/   # CI: CodeQL, npm audit, lint+test, header doğrulama
├── docs/                # Mimari, tehdit modeli, header rehberi, denetim raporu
│   ├── assets/          # Logo ve ekran görüntüleri
│   └── deepsearch/      # Araştırma notları
├── demo/                # Demo video ve ekran görüntüleri
├── public/              # Statik front-end dosyaları
│   ├── css/             # theme.css, main.css, components.css, audit.css
│   └── js/              # app.js, audit-ui.js
├── scripts/             # audit-headers.sh, split-commits.sh
├── src/
│   ├── config/          # Header değerleri için tek kaynak (constants, headers, index)
│   ├── controllers/     # HTTP handler mantığı
│   ├── middleware/      # Nonce, Helmet, Permissions-Policy, rate limit, hata yönetimi
│   ├── routes/          # Express router'ları
│   ├── services/        # Header denetim servisleri (headerAuditor, externalAuditor)
│   ├── utils/           # Logger, crypto yardımcıları
│   └── views/           # HTML şablonları (index, audit, about)
├── tests/               # Jest + supertest test dosyaları
├── Dockerfile           # Multi-stage, distroless, non-root
├── docker-compose.yml
├── package.json
├── ROADMAP.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── .env.example
```

---

## 🚀 Kurulum

### 1. Klonla ve Yapılandır

```bash
git clone https://github.com/hizir777/Security_headers_hardening
cd Security_headers_hardening
cp .env.example .env
# .env dosyasını ihtiyacına göre düzenle
```

### 2. Node.js ile Çalıştır

```bash
nvm install        # .nvmrc'den Node 20 yükler
nvm use            # Node 20'ye geçer
npm install
npm run dev        # localhost:3000'de sunucu başlar
```

### 3. Docker ile Çalıştır

```bash
docker compose up --build
```

### 4. Testler ve Denetim

```bash
npm test                    # Jest + supertest
npm run test:headers        # curl tabanlı header denetimi
npm run lint                # ESLint
```

Tarayıcıda <http://127.0.0.1:3000/audit> adresini açarak canlı denetim panelini kullanabilirsiniz.

---

## 🎬 Demo

Demo videosu ve ekran görüntüleri [`demo/`](demo/) klasöründe yer almaktadır.

### Video

> Demo videosu kaydedildikten sonra aşağıdaki link güncellenecektir.

[![Demo Videosu](https://img.shields.io/badge/YouTube-Demo%20Videosu-FF0000?style=flat-square&logo=youtube)](https://www.youtube.com/watch?v=PLACEHOLDER)

---

## 📚 Belgeleme

| Dosya | Açıklama |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Modül diyagramı ve middleware sırası |
| [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md) | STRIDE tabanlı tehdit analizi |
| [docs/HEADERS.md](./docs/HEADERS.md) | Altı temel header'ın detaylı referansı |
| [docs/AUDIT_REPORT.md](./docs/AUDIT_REPORT.md) | Site karşılaştırma matrisi ve denetim raporu |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Aşamalı dağıtım planı |
| [ROADMAP.md](./ROADMAP.md) | Proje yol haritası |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Katkı sağlama rehberi |
| [SECURITY.md](./SECURITY.md) | Güvenlik açığı bildirimi |
| [CHANGELOG.md](./CHANGELOG.md) | Sürüm geçmişi |

---

## 🔗 Kaynaklar

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [OWASP Top 10 A05:2021 — Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [Weichselbaum et al., *CSP Is Dead, Long Live CSP!*, ACM CCS 2016](https://research.google/pubs/csp-is-dead-long-live-csp-on-the-insecurity-of-whitelists-and-the-future-of-content-security-policy/)
- [RFC 6797 — HTTP Strict Transport Security](https://datatracker.ietf.org/doc/html/rfc6797)
- [RFC 7034 — X-Frame-Options](https://datatracker.ietf.org/doc/html/rfc7034)
- [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory)
- [SecurityHeaders.com](https://securityheaders.com/)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

## 📄 Lisans

MIT lisansı altında dağıtılmaktadır. Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

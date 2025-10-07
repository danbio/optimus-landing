# Landing Page — Optimus Energia Solar

Landing moderna focada em conversão, com calculadora de economia e conformidade LGPD.

## Estrutura
- `index.html`, `css/styles.css`, `js/main.js`: front-end estático
- `snippets/consent-banner.html`: banner de consentimento com carregamento condicional de GA4/Pixel
- `politica-de-privacidade.html`: página LGPD
- `backend/`: Django mínimo com endpoint `/api/recaptcha/verify/`

## Dev rápido
```powershell
# Servidor estático (porta 5500)
py -m http.server 5500
# ou
python -m http.server 5500
```

Backend Django (opcional)
```powershell
py -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:DJANGO_SECRET_KEY = "dev-secret"; $env:RECAPTCHA_SECRET = "SUA_SECRET_KEY"
python backend\manage.py runserver 0.0.0.0:8001
```

## reCAPTCHA / Consentimento
- Configure `RECAPTCHA_SITE_KEY` no front e `RECAPTCHA_SECRET` no backend.
- Edite `snippets/consent-banner.html` com seu GA4 Measurement ID e Meta Pixel ID.

## Deploy
- Landing estática pode ir para qualquer hosting.
- Backend Django pode rodar em subdomínio (ex.: api.seudominio.com) — ajustar CORS/URLs.

## Licença
Uso interno da Optimus.

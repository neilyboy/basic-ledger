# Basic Ledger

A self-hosted, installable Next.js PWA for tracking company credit card expenses and receipts. Built to run as a Docker Compose container on Ubuntu and look great on mobile.

## Features

- **New Expense**: Capture a receipt from the camera or gallery, enter amount, date, vendor, category, and notes, plus odometer for `Fuel`.
- **Professional PDF**: Generates a two-column receipt PDF with the company logo, expense details, and the receipt image.
- **Share / Email**: Uses the Web Share API to send the PDF + raw receipt image to your mail app. Optional SMTP backend is planned.
- **History & Reports**: Monthly/yearly totals, category breakdown, and sortable transaction list.
- **Admin**: PIN-protected settings, categories, recipients, and PIN change.
- **PWA**: Installable on mobile home screen with manifest and service worker.

## Quick Start

1. Clone the repo:

```bash
git clone https://github.com/neilyboy/basic-ledger.git
cd basic-ledger
```

2. Copy the example environment file and edit it:

```bash
cp .env.example .env
```

3. Run with Docker Compose:

```bash
docker compose up -d
```

4. Open `https://your-domain.tld` on your phone. The default admin PIN is `1234` (set `ADMIN_PIN` in your `.env` or `docker-compose.yml`).

## Development

```bash
npm install
npm run build
npm run start
```

For standalone mode:

```bash
node .next/standalone/server.js
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `ADMIN_PIN` | `1234` | 4-digit admin PIN. |
| `APP_NAME` | `Basic Ledger` | App/PWA name. |
| `COMPANY_NAME` | — | Printed on PDFs. |
| `REPLY_TO` | — | Reply-to email (optional). |
| `SMTP_HOST` | — | Optional SMTP server. |
| `SMTP_PORT` | `587` | Optional SMTP port. |
| `SMTP_USER` | — | Optional SMTP user. |
| `SMTP_PASS` | — | Optional SMTP password. |

## Notes

- HTTPS is required for camera access and reliable PWA install.
- The SQLite database and uploaded images are stored in the `data/` and `uploads/` Docker volumes.
- OCR and SMTP sending are planned for the next iteration.

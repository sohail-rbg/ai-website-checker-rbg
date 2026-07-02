# AI Website Readiness Checker

A Next.js SaaS MVP that analyzes whether a website is ready for AI search engines and LLM answer systems such as ChatGPT, Claude, Gemini, Perplexity, Google AI Overview, and Microsoft Copilot.

## Features

- Live website scanner with real technical analysis
- AI readiness score and platform readiness estimates
- Robots.txt, sitemap, metadata, schema, headings, images, links, content, EEAT, entities, and Lighthouse checks
- SSRF protection and scan rate limiting
- Lead capture with MongoDB and Mongoose
- Complete report email through Nodemailer
- Hosted printable report pages
- Protected leads viewer

## Tech Stack

- Next.js App Router
- JavaScript
- Tailwind CSS
- CSS Modules
- MongoDB + Mongoose
- Axios, Cheerio, Puppeteer, Lighthouse, robots-parser, xml2js
- Nodemailer
- Recharts
- Framer Motion
- React Hook Form
- React Hot Toast

## Environment Variables

Create `.env.local`:

```env
MONGODB_URI=
MONGODB_DB=ai_website_checker

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

ADMIN_TOKEN=
```

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm start
```

## Routes

- `/` - scanner and report dashboard
- `/api/scan` - website scan API
- `/api/email` - lead capture and report email API
- `/report/[id]` - hosted printable report
- `/api/report/[id]` - report JSON
- `/leads?token=ADMIN_TOKEN` - protected leads viewer
- `/api/leads?token=ADMIN_TOKEN` - protected leads JSON

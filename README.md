# Label Apsáre

*Crafted for her modern aesthetic.* An e-commerce store for Label Apsáre sarees and women's ethnic wear.

One Next.js app serves the storefront, the admin panel and the REST API (`/api`).

| Part | Stack |
| --- | --- |
| `client/` | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4; API as Route Handlers with Prisma 7 + PostgreSQL (Neon in production) |
| Images | Cloudinary (local `public/uploads` in dev without keys) |

The build plan and open questions are in [docs/PLAN.md](docs/PLAN.md); the API contract is [docs/API.md](docs/API.md).

## Getting started

Prerequisites: Node 20+, Docker (for local Postgres).

```bash
docker compose up -d                        # Postgres on localhost:5432
npm install
cp client/.env.example client/.env.local    # then set JWT_SECRET (and Cloudinary keys if you have them)
npm run db:deploy                           # apply the migrations in client/prisma/migrations
npm run db:seed                             # demo catalog, admin and customer accounts
npm run dev                                 # site + API on http://localhost:3000
```

All env vars live in `client/.env.local` (see `client/.env.example`). The browser calls the same-origin `/api`; nothing else needs to run.

In production, point `DATABASE_URL` at a [Neon](https://neon.tech) project's pooled connection
string with `sslmode=require`, and run `prisma migrate deploy` against it once before the first
deploy (see `client/.env.example` for the pooled vs. unpooled shape and when to use each).

## Project structure

```
.
├── client/                         Next.js app: storefront, admin panel and API
│   ├── prisma/                     schema.prisma, migrations/, seed.ts
│   ├── public/                     brand/, images/ (uploads/ in dev)
│   ├── test/                       Vitest integration suite (runs on apsare_test)
│   └── src/
│       ├── app/
│       │   ├── (store)/            Customer site (shared header/footer)
│       │   │   ├── page.tsx        Home
│       │   │   ├── shop, category/[slug], new-arrivals, offers, search
│       │   │   ├── product/[slug]
│       │   │   ├── wishlist, cart, checkout, checkout/success/[orderNumber]
│       │   │   ├── (auth)/         login, signup, forgot-password, reset-password
│       │   │   ├── account/        profile, addresses, orders, orders/[orderNumber]
│       │   │   └── about, contact
│       │   ├── admin/
│       │   │   ├── login/
│       │   │   └── (panel)/        dashboard, products, categories, orders,
│       │   │                       customers, coupons, banners, settings
│       │   └── api/                Route Handlers (route.ts) for every /api endpoint
│       ├── server/                 Server-only: env, Prisma, route() wrapper (auth,
│       │                           CSRF, rate limits, errors), services per module,
│       │                           queries.ts (data for Server Components)
│       ├── components/             layout/, product/, ui/, admin/, account/
│       ├── lib/                    api client, pricing, constants
│       └── types/                  API response types
├── docs/                           PLAN.md, API.md
├── docker-compose.yml               Local Postgres
└── MIGRATION.md                    Express → Next.js migration ledger
```

## Scripts (from repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app in watch mode on http://localhost:3000 |
| `npm run build` / `npm run start` | Production build / serve it |
| `npm run typecheck` | Type-check the app and the tests |
| `npm run lint` | Lint |
| `npm test` | Integration tests against the `apsare_test` database (Postgres must be running; see docs/API.md "Testing") |
| `npm run db:deploy` / `db:migrate` / `db:status` / `db:generate` / `db:seed` | Prisma: apply migrations / create a new one in dev / status / regenerate the client / seed |

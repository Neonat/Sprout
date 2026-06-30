# plantemon-server

Vercel-hosted API that fronts Plant.id and NVIDIA, plus cloud save for the
Plantemon garden. The keys in [`local.properties`](../Plantemon/local.properties)
move here — the client never sees them again.

```
client (Expo)  ──Bearer JWT──▶  this server  ──secret keys──▶  Plant.id / NVIDIA
                                     │
                                     ├─▶  Neon Postgres  (users + plants)
                                     └─▶  Vercel Blob    (cached sprite PNGs)
```

## Endpoints

| Method | Path                | Purpose |
|--------|---------------------|---------|
| POST   | `/api/identify`     | Proxy to Plant.id v3. Body: `{ imageBase64 }` |
| POST   | `/api/sprite`       | Two-step Gemma-3 → Flux pipeline. Body: `{ name, imageBase64 }` → `{ url, cached }` |
| GET    | `/api/me`           | Returns `{ user, garden }` for the signed-in user |
| PATCH  | `/api/me`           | Update username / activePlantId / healCharges |
| GET    | `/api/plants`       | List this user's plants |
| POST   | `/api/plants`       | Create a plant (cap of 6) |
| PATCH  | `/api/plants/[id]`  | Mutate hp / moves / etc. |
| DELETE | `/api/plants/[id]`  | Release a plant |

Every endpoint requires `Authorization: Bearer <clerk-jwt>`. First call from
a new Clerk user auto-creates a row in `users` (see [`src/lib/auth.ts`](src/lib/auth.ts)).

## One-time setup

```bash
cd plantemon-server
npm install
npx vercel link              # creates the Vercel project
```

Then in the **Vercel dashboard** for the project:

1. **Storage → Marketplace → Neon** → create a Postgres database
   (auto-sets `DATABASE_URL`).
2. **Storage → Blob** → create a Blob store
   (auto-sets `BLOB_READ_WRITE_TOKEN`).
3. **Marketplace → Clerk** → install
   (auto-sets `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`).
4. **Settings → Environment Variables** → add the three you brought from
   `local.properties`:
   - `PLANT_API_KEY`
   - `NVIDIA_API_KEY`
   - `FLUX_API_KEY`

Pull them locally so `vercel dev` works:

```bash
npx vercel env pull .env.local
```

Create the database tables:

```bash
npm run db:generate          # writes ./drizzle/*.sql from schema.ts
npm run db:migrate           # applies them to Neon
```

## Run locally

```bash
npm run dev                  # → http://localhost:3000
```

Smoke test (you'll need a Clerk JWT from the client app, but `/identify`
will at least 401 cleanly):

```bash
curl -i http://localhost:3000/api/identify \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"..."}'
# → 401 {"error":"Missing bearer token"}
```

## Deploy

```bash
npx vercel deploy --prod
```

You'll get a URL like `https://plantemon-server.vercel.app`. Plug that
into the Expo client as `EXPO_PUBLIC_API_URL`.

## File map

```
plantemon-server/
├── api/                     Vercel serverless functions (one per route)
│   ├── identify.ts          → Plant.id proxy
│   ├── sprite.ts            → Gemma-3 + Flux pipeline
│   ├── me.ts                → user profile + full garden
│   └── plants/
│       ├── index.ts         → list / create
│       └── [id].ts          → patch / delete (ownership-checked)
├── src/
│   ├── db/
│   │   ├── schema.ts        Drizzle schema — users + plants (Option B)
│   │   └── client.ts        Neon connection
│   └── lib/
│       ├── auth.ts          Clerk JWT verify + lazy user provisioning
│       ├── plantid.ts       Port of PlantApiService.java
│       ├── sprite.ts        Port of SpriteGeneratorService.java + Blob cache
│       └── respond.ts       Error → HTTP status mapping
├── drizzle.config.ts
├── vercel.json
├── tsconfig.json
└── .env.example
```

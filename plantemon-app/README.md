# plantemon-app

Expo (React Native) client for Plantemon. One TypeScript codebase → iOS app,
Android app, and a webapp. Talks to [`../plantemon-server`](../plantemon-server)
for everything that needs a secret key (Plant.id, NVIDIA) or persistence
(Neon Postgres, Vercel Blob, Clerk auth).

```
app/
├── _layout.tsx           Clerk provider + status bar
├── index.tsx             Auth gate → redirects to sign-in or home
├── (auth)/
│   ├── sign-in.tsx
│   └── sign-up.tsx       Email + 6-digit code
└── (app)/
    ├── _layout.tsx       Stack with green theme
    ├── home.tsx          ← MainActivity
    ├── garden.tsx        ← GardenActivity
    ├── scan.tsx          ← ScanActivity (camera or upload)
    ├── info/[id].tsx     ← InfoActivity
    └── battle.tsx        ← BattleActivity

src/
├── game/                 Pure-TS port of com.g4ng.{model,logic}
│   ├── types.ts          Plant, Player, BattlePhase
│   ├── moveBase.ts       MoveBase + TaxonomyMoveMapBase
│   ├── actions.ts        Move + HealAction
│   ├── battle.ts         BattleHandler + BotController
│   ├── plantFactory.ts   PlantFactory.createFromApi/Scan/Saved
│   └── __tests__/        Port of BattleLogicTest.java
└── lib/
    ├── api.ts            Fetch wrapper around plantemon-server
    ├── storage.ts        AsyncStorage cache of /me
    └── clerkTokenCache.ts SecureStore on native, no-op on web

assets/data/
├── moves.json            Copied from Android res/raw
└── taxonomy.json         Copied from Android res/raw
```

## One-time setup

```bash
cd plantemon-app
npm install
cp .env.example .env.local
# fill in EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk dashboard)
# fill in EXPO_PUBLIC_API_URL          (your deployed plantemon-server)
```

You need the server deployed (or running locally on a tunnel) before the
client does anything useful. See [`../plantemon-server/README.md`](../plantemon-server/README.md).

## Run the three targets

```bash
npm start
# then press:
#   i  → open iOS simulator (requires Xcode)
#   a  → open Android emulator (requires Android Studio)
#   w  → open in web browser
```

For a physical iPhone/Android phone, install **Expo Go**, scan the QR code.

## Tests

```bash
npm test
```

These are the same scenarios as
[`BattleLogicTest.java`](../Plantemon/app/src/test/java/com/g4ng/logic/BattleLogicTest.java) —
if they pass, the battle port is faithful to the Java.

## Building for the stores

```bash
npm install -g eas-cli
eas login
eas build --platform ios       # uploads to TestFlight
eas build --platform android   # produces an .aab for Play Store
```

## Web deploy

```bash
npx expo export --platform web
npx vercel deploy ./dist --prod
```

## What's stubbed

- **Battle screen** picks a clone of your first plant as the opponent.
  Replace with a real bot roster (probably server-generated) before launch.
- **Username** defaults to "Trainer" from the server; no UI to edit it yet.
- **Offline scan fallback** isn't ported (the Java path that opens a
  name-dialog when Plant.id is unreachable). Easy to add: catch
  `api.identify` failure and prompt for a name, then call `createFromScan`.
- **Icons / launch screens** are Expo defaults. Replace `assets/images/*`.

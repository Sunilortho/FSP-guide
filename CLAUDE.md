# CLAUDE.md — FSP Vorbereitung Guide (German Doctors Exam Prep)

## Project Overview
React Native app (Expo + EAS) for foreign doctors preparing for the German FSP (Fachsprachprüfung) exam.
Built with Expo Router, tRPC, Hono backend, ElevenLabs TTS.
Owner: Dr. Sunil Kumar Singh — MediCortex (medicortex.de)

## Tech Stack
- **Framework:** Expo SDK 54, React Native 0.81.5, React 19
- **Routing:** expo-router v6
- **Backend:** Hono + tRPC (single route: TTS via ElevenLabs)
- **State:** Zustand, AsyncStorage, React Context
- **Build:** EAS Build (AAB for Play Store internal testing)
- **Original platform:** Built on Rork.ai (rork.com)

## Directory Structure
```
app/              # expo-router screens
  _layout.tsx     # Root layout — ErrorBoundary, tRPC provider, context stack
  (tabs)/         # Tab navigation
backend/
  hono.ts         # Hono server entry point
  trpc/
    app-router.ts # tRPC router (only route: tts.speakElevenLabs)
    routes/tts.ts # ElevenLabs TTS mutation
contexts/
  UserContext.tsx       # User profile + tier (AsyncStorage)
  DemoContext.tsx       # Demo/trial logic
  DocumentsContext.tsx  # Document storage
lib/
  trpc.ts         # tRPC client — reads EXPO_PUBLIC_RORK_API_BASE_URL
```

## Known Production Bug — BLINKING WHITE SCREEN IN AAB BUILD
**Symptoms:** Works perfectly on Expo Go. On Play Store internal testing AAB: blinking white → content → white loop.

**Root Causes (diagnosed):**

### Cause 1 — CRITICAL: Missing env var in EAS build
`lib/trpc.ts` reads `process.env.EXPO_PUBLIC_RORK_API_BASE_URL` for the backend URL.
This variable is NOT set in `eas.json` — so in production the URL is `""`.
tRPC client initialises with empty URL → every API call fails → React render crashes → ErrorBoundary retries → **blink loop**.

### Cause 2 — Rork SDK in metro config
`metro.config.js` uses `withRorkMetro` from `@rork-ai/toolkit-sdk`.
This wrapper was designed for Rork's cloud platform (Expo Go tunnel).
In a standalone EAS build without Rork infrastructure, this causes broken module references.

### Cause 3 — New Architecture on bleeding-edge stack
`app.json` has `"newArchEnabled": true`.
React 19 + New Arch + `react-native-worklets 0.5.1` has known instability in standalone builds.

## Environment Variables Needed

### Client-side (in eas.json `env` block):
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-deployed-backend.com
```

### Server-side (in Railway/Render/Vercel env settings):
```
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Backend Deployment
The backend is a simple Hono server (`backend/hono.ts`).
It needs to be self-hosted — Railway, Render, or Vercel all work.
Only one endpoint: `POST /api/trpc/tts.speakElevenLabs`

### Deploy to Railway (fastest):
1. Run: `railway login && railway init && railway up`
2. Set env var: `ELEVENLABS_API_KEY=...`
3. Copy the Railway URL → use as `EXPO_PUBLIC_RORK_API_BASE_URL`

### Deploy to Render:
1. Connect GitHub repo to Render
2. Set start command: `node backend/hono.ts` (or use bun)
3. Set env var: `ELEVENLABS_API_KEY=...`

## Fix Priority Order
1. **Fix 1 (5 min):** Set `newArchEnabled: false` in app.json → rebuild → test
2. **Fix 2 (30 min):** Deploy backend to Railway → add URL to eas.json → rebuild
3. **Fix 3 (1 hr):** Remove Rork SDK from metro.config.js → use standard Expo metro

## EAS Build Commands
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build internal AAB (for Play Store internal testing)
eas build --profile internal --platform android

# Check build status
eas build:list

# Add secret env var
eas secret:create --scope project --name EXPO_PUBLIC_RORK_API_BASE_URL --value "https://your-url.com"
```

## Important Notes
- Do NOT remove `@rork-ai/toolkit-sdk` from package.json without also updating metro.config.js
- The backend/hono.ts has NO authentication — add API key check before production launch
- `SplashScreen.hideAsync()` fires immediately in useEffect — if app crashes before this, white screen shows
- ElevenLabs voices are hardcoded in tts.ts — ELEVENLABS_API_KEY must be set server-side

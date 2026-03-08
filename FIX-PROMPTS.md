# FSP App — Claude Code Fix Prompts
# Copy-paste these into Claude Code (claude command in terminal) inside the project folder

---

## HOW TO USE
1. Open terminal
2. cd into your project folder (where app.json is)
3. Run: `claude`
4. Paste the prompt for the fix you want
5. Claude Code will make the changes and you review + confirm

---

## ⚡ FIX 1 — Disable New Architecture (Start here, 5 min)
**Do this first. It's the lowest risk and often kills the blink loop immediately.**

Paste into Claude Code:
```
In app.json, change "newArchEnabled": true to "newArchEnabled": false.
Then check if react-native-worklets in package.json is compatible with old architecture —
if it requires new arch, remove it from package.json and find all files that import from it,
removing or replacing those imports with compatible alternatives.
After making changes, run: npx expo install --check
to fix any dependency mismatches.
Show me a summary of every file you changed.
```

---

## ⚡ FIX 2 — Add Backend URL to EAS Build Config
**Do after Fix 1. Requires your deployed backend URL.**

Paste into Claude Code:
```
In eas.json, add an env block to the "internal" profile so the app knows where the backend is.
The environment variable is EXPO_PUBLIC_RORK_API_BASE_URL and the value should be
the Railway/Render/Vercel URL I will provide.

Also add a "production" profile in eas.json with the same env var.

Then open lib/trpc.ts and add a clear console.error (not just console.warn) when
EXPO_PUBLIC_RORK_API_BASE_URL is missing, so it's visible in EAS build logs.

Also add a runtime guard: if the URL is empty, render a fallback error screen saying
"Backend not configured — please contact support" instead of crashing silently.

Show me every change made.
```

---

## ⚡ FIX 3 — Remove Rork SDK from Metro Config
**Do after Fix 1 & 2. Decouples your app from Rork's infrastructure.**

Paste into Claude Code:
```
The project uses @rork-ai/toolkit-sdk in metro.config.js via withRorkMetro().
This was for Rork's platform and breaks in standalone EAS builds.

Do the following:
1. Replace metro.config.js with a clean standard Expo metro config (no Rork wrapper)
2. Check if @rork-ai/toolkit-sdk is used anywhere else in the codebase (search all files)
3. Remove any Rork-specific imports that are only needed for the Rork tunnel/dev environment
4. Keep anything from @rork-ai/toolkit-sdk that is used in actual app screens
5. Update package.json if @rork-ai/toolkit-sdk can be fully removed
6. Run: npx expo install --check after changes

Show me a full list of every file changed and why.
```

---

## ⚡ FIX 4 — Deploy Backend to Railway + Wire It Up
**Do this to fully fix the missing backend URL problem.**

Paste into Claude Code:
```
I need to deploy my Hono backend (in backend/hono.ts) to Railway.
The backend uses ElevenLabs for TTS and needs ELEVENLABS_API_KEY as an env var.

Do the following:
1. Create a railway.json config file in the project root for deployment
2. Create a Procfile or add a "start" script in package.json specifically for the backend server
3. Check if the backend needs a separate package.json or can share the root one
4. Make sure the Hono server listens on process.env.PORT (Railway sets this automatically)
5. Add CORS configuration that allows requests from the mobile app
6. Add a health check endpoint GET /health that returns { status: "ok" }

Then show me the exact Railway CLI commands to run to deploy,
and the exact env vars I need to set in the Railway dashboard.
```

---

## ⚡ FIX 5 — Add Defensive Loading States (Prevent silent crashes)
**Do this to make the app resilient — no more blank white even if backend is down.**

Paste into Claude Code:
```
The app currently shows a blank white screen when the tRPC backend is unavailable.
I need defensive loading states so it never shows blank.

Do the following:
1. In app/_layout.tsx — the SplashScreen.hideAsync() fires immediately.
   Change it so splash only hides AFTER UserContext finishes loading (isLoading === false).
   Use a ref or state to track readiness before hiding splash.

2. In lib/trpc.ts — if EXPO_PUBLIC_RORK_API_BASE_URL is empty or undefined,
   wrap the client in a safe fallback that returns empty/mock data instead of throwing.

3. Add a network status check: if the app launches with no backend connectivity,
   show a proper offline screen with a retry button instead of crashing.

4. In the ErrorBoundary in _layout.tsx — the current error UI uses dark background styles.
   Make sure the error container background is definitely not white (#ffffff)
   so it's visually distinguishable from the blank screen bug.

Show every file changed with before/after diffs.
```

---

## ⚡ FIX 6 — Full Debug Build with Logging (Find the exact crash point)
**Use this if the above fixes don't work — to get logs out of the production build.**

Paste into Claude Code:
```
I need to add crash logging to find the exact point where the app fails in production.

Do the following:
1. In app/_layout.tsx, add console.log checkpoints at every stage:
   - Before tRPC provider renders
   - Inside each Context Provider (UserProvider, DemoProvider, DocumentsProvider)
   - When SplashScreen.hideAsync() is called
   - In the ErrorBoundary componentDidCatch

2. In lib/trpc.ts, log the full URL being used on app startup

3. Add a try-catch around the tRPC client creation in trpcClient = trpc.createClient(...)
   so if it throws, it logs the error instead of crashing silently

4. Add expo-dev-client setup so I can connect a debugger to the internal build
   (add expo-dev-client to package.json and update eas.json "internal" profile
   to include "developmentClient": true)

Show me the eas build command to use for a debuggable internal build.
```

---

## ⚡ FIX ALL — Run Everything in Sequence
**One prompt to do all fixes at once. Use only if you're comfortable reviewing large changesets.**

Paste into Claude Code:
```
I have a blinking white screen bug in my EAS AAB build. The app works on Expo Go but fails in Play Store internal testing.

Root causes already diagnosed:
1. newArchEnabled: true — needs to be false
2. EXPO_PUBLIC_RORK_API_BASE_URL not set in eas.json — needs to be added
3. metro.config.js uses withRorkMetro from @rork-ai/toolkit-sdk — needs to be replaced
4. No defensive loading — app crashes silently on missing backend

Please fix all of these in order:
Step 1: Set newArchEnabled: false in app.json
Step 2: Update eas.json to add env block with EXPO_PUBLIC_RORK_API_BASE_URL placeholder
Step 3: Replace metro.config.js with standard Expo metro config
Step 4: Add defensive loading in _layout.tsx so splash hides only after UserContext loads
Step 5: Add fallback error screen for when backend URL is missing
Step 6: Create railway.json and a backend start script for deployment

For each step, show me the exact diff before moving to the next.
Ask me to confirm before applying Step 3 onwards.
```

---

## AFTER FIXING — Rebuild Command
Run this in your terminal after any code change:
```bash
# Clean cache first
npx expo start --clear

# Then build new AAB for internal testing
eas build --profile internal --platform android --clear-cache
```

## CHECK BUILD LOGS
If the build shows errors, run:
```bash
eas build:view   # opens latest build logs in browser
```

---

## Notes
- Always run `npx expo install --check` after changing dependencies
- If Railway deploy fails, try Render.com as alternative (free tier available)
- Keep ELEVENLABS_API_KEY only on the server — never in the app bundle
- Once fixed, bump version in app.json before re-uploading to Play Store

# PingPongTracker - LogIt

Mobile-friendly ping pong league tracker for a small friend group. Games are stored in a [Google Sheet](https://docs.google.com/spreadsheets/d/1x5oF4e2MZKXJgzaksNLKVpoWB3vrfaUUCOpBPtfXeDo/edit?usp=sharing); ELO and standings are computed in the browser from match history.

## Sheet setup

Two tabs:

| Tab | Headers |
|-----|---------|
| **Matches** | `Timestamp`, `Winner`, `Loser`, `Winner_Score`, `Loser_Score`, `Winner_side` |
| **Players** | `Name` |

## Backend (Google Apps Script)

1. Open the spreadsheet → **Extensions** → **Apps Script**.
2. Replace the default script with the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. **Deploy** → **New deployment** → type **Web app**.
4. **Execute as:** Me · **Who has access:** Anyone
5. Authorize when prompted, then copy the **Web app URL** ending in `/exec`.

**Updating the script later:** use **Deploy** → **Manage deployments** → pencil icon → **Version: New version** → Deploy. Do **not** create a **New deployment** unless you intend to change the URL (that breaks the site).

### Test with curl

Replace `YOUR_EXEC_URL` with your deployed URL.

```bash
curl -L "YOUR_EXEC_URL"
```

Valid POST (11–9, win by 2):

```bash
curl -L -X POST "YOUR_EXEC_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d "{\"winner\":\"Alice\",\"loser\":\"Bob\",\"winnerScore\":11,\"loserScore\":9,\"winnerSide\":\"Fridge\"}"
```

Rejected POST (11–10, not win by 2):

```bash
curl -L -X POST "YOUR_EXEC_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d "{\"winner\":\"Alice\",\"loser\":\"Bob\",\"winnerScore\":11,\"loserScore\":10,\"winnerSide\":\"Fridge\"}"
```

## Frontend

1. Paste the `/exec` URL into `API_URL` in [`src/api.ts`](src/api.ts).
2. Install and run locally:

```bash
npm install
npm run dev
```

3. Production build (for GitHub Pages):

```bash
npm run build
```

### GitHub Pages (recommended)

1. Create a GitHub repo and push this project (include source, not only `dist/`).
2. Repo **Settings → Pages → Build and deployment → Source:** **GitHub Actions**.
3. Push to the `main` branch (or run the **Deploy to GitHub Pages** workflow manually). The workflow in [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) runs `npm run build` and publishes `dist/`.
4. Your site URL will be `https://<username>.github.io/<repo-name>/` (or your custom domain).

Local smoke test before pushing:

```bash
npm run build
npm run preview
```

Open the URL Vite prints (usually `http://localhost:4173`). The Vite config uses `base: './'` so assets work on project pages.

### ELO settings

Defaults in [`src/elo.ts`](src/elo.ts): starting rating **1500**, **K = 32**. Edit those constants to tune behavior; the sheet only stores raw matches.

### Score rules

Play to 11, win by 2. Winner score 11–30. At 11, loser may be 0–9. At 12+, loser must be exactly winner − 2 (e.g. 12–10, 15–13).

## App tabs

- **Stats** (default): live ELO rankings, rating chart, W/L standings.
- **Log Game**: pick or add players, winner side (Fridge / Outdent), scroll wheels for scores, **Publish** to append a row.

# Key Template (web)

Interactive single-page version of John's key/chord PDF template.

## Open it

No build or server needed. Either:

1. **Finder / file manager:** double-click `index.html`, or  
2. **Browser:** open  
   `file:///workspace/music-cheatsheets/key-template-web/index.html`  
3. **Quick local server** (optional):  
   `cd /workspace/music-cheatsheets/key-template-web && python3 -m http.server 8765`  
   then visit `http://localhost:8765/`

Works offline in Safari / Chrome / Firefox (including iPhone Safari). A service worker caches the app when served over `http`/`https` (not `file://`).

## Use

Pick any of the 24 keys from the **Key** dropdown. The notes, chord table, pianos, and progressions update instantly.

## Deploy to GitHub Pages

This folder is a static site (relative paths only — safe for project pages like `username.github.io/repo/`).

1. Push this folder to a GitHub repo (as the site root, or under `/docs`, or via Actions).
2. In the repo: **Settings → Pages →** set source to the branch/folder that contains `index.html`.
3. After deploy, open `https://<user>.github.io/<repo>/` (trailing slash optional; assets use `./` relative paths).

No backend and no build step.

## Add to Home Screen (iPhone)

1. Open the hosted URL in **Safari** (not Chrome).
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Confirm the name (**Keys**) and tap **Add**.

The app opens fullscreen (`standalone`) with the Key Template icon.

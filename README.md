# Instagram Follow Checker

Local-only Manifest V3 Chrome extension for comparing Instagram followers and following using the browser session you are already logged into.

## Structure

```text
.
├── manifest.json
├── background.js
├── popup.html
├── popup.css
├── popup.js
├── results.html
├── results.css
├── results.js
└── src
    ├── compare.js
    ├── csv.js
    ├── instagramApi.js
    └── storage.js
```

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this project directory.
5. Log in to `https://www.instagram.com` in the same browser profile.
6. Open the extension popup and click `Scan Account`.

## Notes

- The extension stores the last scan only in `chrome.storage.local`.
- The extension does not ask for an Instagram password and does not send follower data to a server.
- It intentionally does not automate unfollowing.
- Instagram's internal web API can change without notice, so endpoint or header updates may be needed later.

## Publishing

Publishing support docs are in `docs/`:

- `docs/PRIVACY_POLICY.md` - privacy policy draft to publish at a stable URL.
- `docs/CHROME_WEB_STORE_LISTING.md` - Chrome Web Store listing copy and permission justifications.
- `docs/PUBLISHING_CHECKLIST.md` - remaining release checklist for assets, dashboard fields, and QA.
- `privacy.html` - browser-ready privacy policy page for GitHub Pages or another public host.

Before submitting to the Chrome Web Store, create the required screenshot and promo image assets, publish the privacy policy URL, and complete the dashboard privacy disclosures. To generate the Web Store image sizes, save screenshots into `docs/store-assets/` and run `python3 tools/prepare_store_assets.py`.

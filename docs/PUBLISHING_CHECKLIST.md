# Publishing Checklist

This checklist is based on the Chrome Web Store documentation for listing information, image assets, privacy practices, and user data policies.

Official references:

- Chrome Web Store listing information: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Chrome Web Store image requirements: https://developer.chrome.com/docs/webstore/images
- Privacy practices dashboard: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- User data policy FAQ: https://developer.chrome.com/docs/webstore/user_data
- Program policies: https://developer.chrome.com/docs/webstore/program-policies/policies

## Repository Readiness

- [x] Manifest V3 extension.
- [x] `manifest.json` version is `0.1.0`.
- [x] Required extension icons generated and wired into `manifest.json`.
- [x] Privacy policy draft exists at `docs/PRIVACY_POLICY.md`.
- [x] Store listing draft exists at `docs/CHROME_WEB_STORE_LISTING.md`.
- [x] Extension avoids password collection.
- [x] Extension requests only the supported website host access.
- [ ] Save the two screenshots as `docs/store-assets/source-results.png` and `docs/store-assets/source-popup.png`.
- [ ] Run `python3 tools/prepare_store_assets.py`.
- [ ] Create a production ZIP from only the extension files.
- [ ] Manually install the ZIP/unpacked folder in a clean Chrome profile.

## Assets Still Needed

- [x] 128x128 extension icon in ZIP.
- [ ] 1280x800 screenshot generated at `docs/store-assets/screenshot-1280x800.png`.
- [ ] 440x280 small promo image generated at `docs/store-assets/small-promo-440x280.png`.
- [ ] 1400x560 marquee promo image, optional.
- [ ] Optional demo video URL.

## Privacy and Policy

- [ ] Publish `privacy/index.html` at a stable public URL.
- [ ] Add that URL in the Chrome Web Store Developer Dashboard.
- [ ] Fill out the Privacy practices tab consistently with the privacy policy.
- [ ] Certify limited use / user data handling in the dashboard.
- [ ] Confirm no remote code is used.
- [ ] Confirm dashboard data disclosures match the extension behavior.

## Dashboard Listing

- [ ] Paste the short description from `docs/CHROME_WEB_STORE_LISTING.md`.
- [ ] Paste the detailed description from `docs/CHROME_WEB_STORE_LISTING.md`.
- [ ] Select category: Productivity.
- [ ] Set language: English.
- [ ] Add homepage URL.
- [ ] Add support URL or support email.
- [ ] Add screenshots and promo images.
- [ ] Add permission justifications from `docs/CHROME_WEB_STORE_LISTING.md`.

## Manual QA

- [ ] Fresh install with no saved scan.
- [ ] Scan account while a supported website tab is open and logged in.
- [ ] Scan with Refresh followers enabled.
- [ ] Scan with Refresh followers disabled after a saved scan exists.
- [ ] Open Results page.
- [ ] Export CSV from popup.
- [ ] Export CSV from results page.
- [ ] Run Discover comparison.
- [ ] Run Group overlap scan with 2+ accounts.
- [ ] Toggle Include me on and off.
- [ ] Confirm Not mine hides when Include me is off.
- [ ] Clear network cache and confirm next scan fetches fresh data.
- [ ] Confirm 429/rate-limit message is understandable.
- [ ] Confirm extension works after closing and reopening Chrome.

## Submission Notes

- Do not claim affiliation with any third-party platform.
- Keep the single purpose narrow: local follower/following comparison.
- Keep permissions limited unless a specific feature requires more access.
- If the extension behavior changes, update the privacy policy and dashboard disclosures before publishing an update.

# Chrome Web Store Listing Draft

## Product Details

Extension name:

```text
Follow Check
```

Short description:

```text
Compare followers and following locally from your browser session.
```

Detailed description:

```text
Follow Check helps you compare followers and following lists using the social media session already open in your browser.

The extension can show:

- They don't: accounts you follow that do not follow you back.
- You don't: accounts that follow you but you do not follow back.
- Mutual accounts.
- Discovery comparisons with another account you follow.
- Group overlap for selected accounts, including optional self-aware buckets.
- CSV exports for local review.

Follow Check is local-first. It does not ask for your password, does not send follower data to a developer server, and stores scan data in Chrome local storage on your device.

This extension is for educational purposes only. It is intended to help users understand their own follower/following relationships locally in their browser.

Platform web APIs can change, so scans may require you to be logged in to the supported website and may be affected by rate limits.
```

Category:

```text
Productivity
```

Language:

```text
English
```

Homepage URL:

```text
https://pavanvenkatreddy.github.io/
```

Privacy policy URL:

```text
Publish privacy/index.html with GitHub Pages and use that public URL.
```

Support URL:

```text
Use the GitHub repository issues page or a public support/contact page.
```

## Single Purpose Statement

```text
Follow Check's single purpose is to compare follower and following lists locally using the user's existing logged-in browser session.
```

## Permission Justifications

`activeTab`

```text
Used only when the user starts a scan, so the extension can inspect the active supported website tab and detect the logged-in account/session context.
```

`scripting`

```text
Used to run a small script on the active supported website tab to read page/session metadata needed to identify the logged-in account and request headers.
```

`storage`

```text
Used to store the user's last local scan, discovery data, and network comparison cache in chrome.storage.local.
```

Supported website host permission

```text
Used to request follower/following pages from the supported website using the user's logged-in browser session. No other host access is requested.
```

## Privacy Practices Draft Answers

Data collected or handled:

```text
Website content and account data from pages requested by the user, including follower/following account lists and account identifiers needed for comparison.
```

Data use:

```text
Extension functionality only.
```

Data transfer:

```text
Data is not sold, shared, or transferred to third parties by the extension developer. The extension requests data from the supported website over HTTPS to perform the user-requested comparison.
```

Remote code:

```text
The extension does not execute remotely hosted code.
```

Authentication data:

```text
The extension does not ask for or store passwords. Requests use the browser's existing logged-in session.
```

## Required Graphic Assets

Completed in repository:

- `icons/icon16.png`
- `icons/icon32.png`
- `icons/icon48.png`
- `icons/icon128.png`
- `icons/icon512.png`

Still needed for submission:

- Save the provided wide screenshot as `docs/store-assets/source-results.png`.
- Save the provided popup screenshot as `docs/store-assets/source-popup.png`.
- Run `python3 tools/prepare_store_assets.py`.
- Upload `docs/store-assets/screenshot-1280x800.png`.
- Upload `docs/store-assets/small-promo-440x280.png`.
- Optional 1400x560 marquee promo image.

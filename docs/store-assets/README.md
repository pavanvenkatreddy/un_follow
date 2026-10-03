# Store Assets

Save the two screenshots from chat into this folder with these filenames:

- `source-results.png` - the wide Results / Group overlap screenshot.
- `source-popup.png` - the tall popup screenshot.

Then run:

```sh
python3 tools/prepare_store_assets.py
```

The script will generate:

- `docs/store-assets/screenshot-1280x800.png`
- `docs/store-assets/small-promo-440x280.png`

Use those generated files in the Chrome Web Store dashboard.


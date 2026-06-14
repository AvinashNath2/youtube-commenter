# YouTube Commenter

A Chrome extension that auto-posts promo comments on YouTube videos.

## Screenshots

| Home Tab | Messages Tab |
|----------|-------------|
| ![Home Tab](screenshots/home.png) | ![Messages Tab](screenshots/messages.png) |

**Auto-comment in action — comment posted notification:**

![Notification](screenshots/notification.png)

## Features

- Auto-comment when a new YouTube video opens
- Manual comment posting
- Comment history log with video title and timestamp
- Fully customizable message templates (add / edit / delete)
- System notification on successful comment

## Setup

**Requirements:** Node.js 18+

```bash
npm install
npm run build
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

The extension icon will appear in your toolbar.

## Development

```bash
npm run dev   # watch mode — auto-rebuilds on file changes
```

After each rebuild, click the reload icon on the extension card in `chrome://extensions`.

## Customize Comments

Open the extension popup → **Messages** tab to add, edit, or delete promo messages.

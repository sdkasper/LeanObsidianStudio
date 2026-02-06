# BasesBuilder

A web application for generating [Obsidian Bases](https://help.obsidian.md/bases/syntax) queries through a simple chat-like interface. Part of **Lean Obsidian Studio**.

## What it does

BasesBuilder helps you create `.base` files for the Obsidian Bases core plugin without writing YAML by hand. Describe what you want in plain text, pick a starter template, and get a valid Base query you can copy or download straight into your vault.

## Features

- **6 starter templates** — Project Progress Bar, Star Ratings Table, Travel Trip Map, Birthday Tracker, Vault Cleaner, Content Summary
- **Keyword-based generation** — type a description and the app matches it to the best template (tasks, reading lists, daily notes, and more)
- **Fallback generator** — extracts tags, folders, and view types from free-form text to build a minimal Base when no template matches
- **Copy & Download** — one-click clipboard copy or download as a `.base` file
- **Modify flow** — after generating, the interface switches to an update mode so you can iterate on your query
- **Reset** — return to a clean slate at any time

## Getting started

No build step required. Open `index.html` in a browser:

```bash
# Clone the repo
git clone https://github.com/sdkasper/BasesBuilder.git
cd BasesBuilder

# Open in your default browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
├── index.html          # Single-page app shell
├── style.css           # Dark-themed UI styles (JetBrains Mono)
├── app.js              # Application logic (generate, reset, copy, download)
├── templates.js        # Pre-built Base templates and keyword mappings
├── CLAUDE.md           # Instructions for Claude Code agents
└── .agents/skills/     # Agent skill definitions
    ├── obsidian-bases/      # Bases syntax reference
    ├── obsidian-markdown/   # Obsidian Markdown reference
    └── frontend-design/     # UI design guidelines
```

## Tech stack

- Vanilla HTML, CSS, and JavaScript — no frameworks, no bundler
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) font via Google Fonts
- Dark UI with cyan accent palette

## Feedback

Use the **Feedback** button in the app footer or submit directly via the [feedback form](https://forms.cloud.microsoft/r/7h7c05F7PU).

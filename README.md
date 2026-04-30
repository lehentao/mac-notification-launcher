# MeetingBeacon

An [Übersicht](https://tracesof.net/uebersicht/) widget for macOS that keeps you aware of what matters while you're focused — meetings, messages, and breaks.

![Widget preview showing meeting and chat alerts]

## What it does

Floating cards appear on your desktop when something needs your attention:

| Alert | Trigger | Goes red after |
|-------|---------|---------------|
| 👥 Meeting | 15 min before start | 0 min (¡AHORA!) |
| 💬 Slack | Unread messages | 10 min |
| 👸 WhatsApp contact | Unread from specific contact | 3 min |
| 🗨️ Google Chat | Unread messages | 60 min |
| 👧👦 Kids (Beeper) | Message from specific Google Chat contacts | 5 min |
| ☕ Break | 2 hours of continuous focus | — |

Each card is clickable and opens the corresponding app. The break card resets on click.

## Prerequisites

- [Übersicht](https://tracesof.net/uebersicht/) — desktop widget engine
- [Homebrew](https://brew.sh/)
- [icalBuddy](https://hasseg.org/icalBuddy/) — `brew install ical-buddy`
- **Calendar.app** synced with your Google Workspace account
- **WhatsApp** (native macOS app)
- **Beeper** — for tracking personal Google Chat contacts
- **Slack** and **Google Chat** installed as apps
- Python 3 (included with macOS)

## Installation

1. Clone into your Übersicht widgets folder:
   ```bash
   git clone https://github.com/lehentao/mac-notification-launcher.git \
     ~/Library/Application\ Support/Übersicht/widgets/MeetingBeacon.widget
   ```

2. Copy and fill in your config:
   ```bash
   cp config.example.sh config.sh
   ```

3. Grant permissions when macOS asks:
   - **Calendar** access → System Settings → Privacy → Calendars → Übersicht
   - **Accessibility** → System Settings → Privacy → Accessibility → Übersicht

4. Refresh Übersicht (`⌘R`)

## Configuration

All personal values live in `config.sh` (git-ignored):

```bash
# WhatsApp contact to monitor (country code + number, no +)
WA_CONTACT="56912345678@s.whatsapp.net"

# Kids' Google Chat IDs via Beeper
# Find them: sqlite3 ~/Library/Application\ Support/BeeperTexts/index.db \
#   "SELECT id, full_name FROM participants WHERE id LIKE '%googlechat%' AND is_network_bot=0;"
KID1_ID="@googlechat_XXXXXXXXXXXXXXXXXX:beeper.local"
KID2_ID="@googlechat_XXXXXXXXXXXXXXXXXX:beeper.local"

# Thresholds (minutes before alert turns red)
WA_THRESHOLD=3
KIDS_THRESHOLD=5
SLACK_THRESHOLD=10
GCHAT_THRESHOLD=60

# Break reminder
BREAK_THRESHOLD=120   # minutes of focus before alert
IDLE_THRESHOLD=300    # seconds of inactivity to reset break timer

# Calendar to exclude from meeting detection
CAL_EXCLUDE="Name of calendar to exclude"
```

To customize icons and labels edit the `WA_CONFIG` and `KIDS` constants at the top of `index.jsx`.

## How meeting detection works

1. **In a meeting** — detects Chrome holding a WebRTC assertion via `pmset`
2. **Upcoming meeting** — reads Calendar.app via `icalBuddy` (must be synced with Google Calendar)
3. Filters out all-day events and configurable calendars (e.g. out-of-office)

## How WhatsApp detection works

Reads the unread count directly from WhatsApp's local SQLite database (`ChatStorage.sqlite`) filtered to a specific contact JID — no API, no tokens.

## How kids detection works

Reads Beeper's local SQLite database (`BeeperTexts/index.db`) filtered to specific Google Chat user IDs. Names update automatically as kids change them in Google Chat.

## Break reminder

Appears after `BREAK_THRESHOLD` minutes of continuous focus. Resets when:
- No keyboard/mouse activity for `IDLE_THRESHOLD` seconds **and** not in a meeting
- Clicked manually

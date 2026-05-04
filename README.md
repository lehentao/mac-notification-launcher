# mac-notification-launcher

An [Übersicht](https://tracesof.net/uebersicht/) widget for macOS that keeps you aware of what matters while you're focused — meetings, messages, breaks, and hydration.

Floating cards appear on your desktop only when something needs your attention. Each card is clickable and opens the corresponding app.

| Alert | Trigger | Goes red after |
|-------|---------|---------------|
| 💼 Meeting | 15 min before start | 0 min (NOW!) |
| 💬 Slack | Unread messages | 10 min |
| 👸 WhatsApp | Unread from configured contacts | 3 min |
| 🗨️ Google Chat | Unread messages | 60 min |
| 👧👦 Kids (Beeper) | Message from specific Google Chat contacts | 5 min |
| ☕ Break | 2 hours of continuous focus | — |
| 🥤 Hydration | Every 2 hours between 8AM–7PM | — |

---

## Prerequisites

- [Übersicht](https://tracesof.net/uebersicht/) — desktop widget engine
- [Homebrew](https://brew.sh/) — `brew install ical-buddy`
- **Python 3** — included with macOS
- **Calendar.app** — synced with Google Calendar
- **WhatsApp** — native macOS app
- **Slack** — desktop app
- **Google Chat** — installed as PWA from Chrome
- **Beeper Desktop** — for personal Google Chat contacts (optional)

---

## Installation

**1. Clone the repo:**
```bash
git clone https://github.com/lehentao/mac-notification-launcher.git \
  ~/Library/Application\ Support/Übersicht/widgets/mac-notification-launcher.widget
```

**2. Create your config:**
```bash
mkdir -p ~/.config/meetingbeacon
cp ~/Library/Application\ Support/Übersicht/widgets/mac-notification-launcher.widget/config.example.sh \
   ~/.config/meetingbeacon/config.sh
```

**3. Copy the helper scripts:**
```bash
cp ~/Library/Application\ Support/Übersicht/widgets/mac-notification-launcher.widget/check_*.py \
   ~/.config/meetingbeacon/
```

**4. Fill in your config:** edit `~/.config/meetingbeacon/config.sh`

**5. Grant permissions in macOS:**
- System Settings → Privacy & Security → **Calendars** → enable Übersicht
- Refresh Übersicht with `⌘R`

---

## Setting up Calendar.app (for meeting detection)

The widget reads your upcoming meetings via `icalBuddy`, which queries Calendar.app. If your calendar is in Google Workspace (corporate account), follow these steps:

1. Open **System Settings → Internet Accounts → Add Account → Google**
2. Sign in with your corporate Google account
3. Make sure **Calendars** is enabled in the permissions
4. Open **Calendar.app** and wait for the initial sync (can take 5–30 min on large calendars)
5. Verify events appear in Calendar.app before expecting the widget to detect them

> **Note:** Calendar.app must be running for the widget to detect meetings.

To find the exact name of calendars you want to exclude (e.g. out-of-office, team absence):
```bash
/opt/homebrew/bin/icalBuddy calendars
```
Copy the name exactly into `CAL_EXCLUDE` in your config.

---

## Setting up Beeper (for kids / personal Google Chat)

Beeper lets you monitor a personal Google Chat account separately from your work one — useful when both accounts share the same Chrome process.

1. Download [Beeper Desktop](https://www.beeper.com/)
2. Sign in and connect your **personal Google account**
3. Verify your kids' chats appear in Beeper
4. Find their Google Chat IDs:
```bash
sqlite3 ~/Library/Application\ Support/BeeperTexts/index.db \
  "SELECT id, full_name FROM participants WHERE id LIKE '%googlechat%' AND is_network_bot=0;"
```
5. Copy the IDs (format: `@googlechat_XXXXXXXXXX:beeper.local`) into `KIDS_IDS` in your config, separated by `|`:
```bash
KIDS_IDS="@googlechat_111111111111@:beeper.local|@googlechat_222222222222:beeper.local"
```
6. Edit the `KIDS` array in `index.jsx` to set each child's icon and fallback name:
```javascript
const KIDS = [
  { icon: "👧", fallbackName: "Tsukasa" },
  { icon: "👦", fallbackName: "Luciano" },
];
```

> **Note:** IDs never change even if kids rename themselves in Google Chat. The display name updates automatically from Beeper's database.

---

## Setting up WhatsApp contact monitoring

The widget reads WhatsApp's local SQLite database directly — no API needed.

1. Install **WhatsApp** from the Mac App Store
2. Sign in and open the chat with the contact you want to monitor
3. Find their JID:
```bash
sqlite3 ~/Library/Group\ Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite \
  "SELECT ZCONTACTJID, ZUNREADCOUNT FROM ZWACHATSESSION ORDER BY ZLASTMESSAGEDATE DESC LIMIT 20;"
```
4. Copy the JID (format: `56912345678@s.whatsapp.net`) into `WA_CONTACTS` in your config

> **Note:** Business/bot contacts use `@lid` format instead of phone numbers.

---

## Configuration reference

All settings live in `~/.config/meetingbeacon/config.sh`:

```bash
# Enable/disable sensors
SENSOR_MEET=true
SENSOR_SLACK=true
SENSOR_WHATSAPP=true
SENSOR_GCHAT=true
SENSOR_KIDS=true
SENSOR_BREAK=true
SENSOR_HYDRA=true

# WhatsApp — JIDs separated by | for multiple contacts
WA_CONTACTS="56912345678@s.whatsapp.net"
WA_THRESHOLD=3        # minutes before turning red

# Kids — Google Chat IDs via Beeper, separated by |
KIDS_IDS="@googlechat_XXXXXXXXXX:beeper.local"
KIDS_THRESHOLD=5

# Slack
SLACK_THRESHOLD=10

# Google Chat (work)
GCHAT_THRESHOLD=60

# Break reminder
BREAK_THRESHOLD=120   # minutes of focus before alert
IDLE_THRESHOLD=300    # seconds of inactivity to reset

# Hydration reminder (appears between 8AM–7PM)
HYDRA_THRESHOLD=120

# Calendar — name of calendar to exclude (e.g. out-of-office)
CAL_EXCLUDE="Name of your calendar"
```

To customize icons and labels for WhatsApp and kids, edit `WA_CONFIG` and `KIDS` at the top of `index.jsx`.

---

## Troubleshooting

**Widget shows nothing:**
- Make sure `~/.config/meetingbeacon/config.sh` exists
- Check that Übersicht has Calendar permission in System Settings → Privacy → Calendars

**Meetings not detected:**
- Verify Calendar.app is open and synced
- Run `/opt/homebrew/bin/icalBuddy eventsToday` in Terminal to confirm it sees your events
- Check the `CAL_EXCLUDE` value matches your calendar name exactly

**Beeper kids not showing:**
- Confirm Beeper Desktop is running and Google Chat is connected
- Run the SQLite query above to verify the IDs are correct

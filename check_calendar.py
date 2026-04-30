#!/usr/bin/env python3
# Lee output de icalBuddy desde stdin y devuelve SOON|N|Título, LATE|N|Título o NONE
import sys, re
from datetime import datetime

WINDOW = 15

SKIP_KEYWORDS = [
    "concentraci", "focus", "ooo", "fuera de", "out of office",
    "ausencia", "bloqueado", "no molestar", "deep work", "tiempo de trabajo"
]

def should_skip(title):
    return any(k in title.lower() for k in SKIP_KEYWORDS)

def parse_time(text):
    m = re.search(r'\b(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|am|pm)?', text, re.IGNORECASE)
    if not m:
        return None
    h, mn = int(m.group(1)), int(m.group(2))
    ampm = (m.group(3) or "").replace(".", "").lower()
    if ampm == "pm" and h != 12:
        h += 12
    elif ampm == "am" and h == 12:
        h = 0
    return h, mn

def extract_title(chunk):
    for line in chunk.splitlines():
        line = line.strip()
        if line and not re.search(r'\d{1,2}:\d{2}', line) and "today" not in line.lower() and "tomorrow" not in line.lower():
            return line[:40]
    return ""

def main():
    now = datetime.now()
    raw = sys.stdin.read()
    best_diff = None
    best_title = ""

    for chunk in raw.split(">>>"):
        if "tomorrow" in chunk.lower():
            continue
        title = extract_title(chunk)
        if should_skip(title):
            continue
        parsed = parse_time(chunk)
        if not parsed:
            continue
        h, mn = parsed
        event_time = now.replace(hour=h, minute=mn, second=0, microsecond=0)
        diff = int((event_time - now).total_seconds() / 60)
        if -WINDOW <= diff <= WINDOW:
            if best_diff is None or abs(diff) < abs(best_diff):
                best_diff = diff
                best_title = title

    if best_diff is None:
        print("NONE")
    elif best_diff >= 0:
        print(f"SOON|{best_diff}|{best_title}")
    else:
        print(f"LATE|{-best_diff}|{best_title}")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# Detecta reuniones próximas leyendo Calendar.sqlitedb directo (sin icalBuddy ni AppleScript)
import sqlite3, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

CORE_DATA_OFFSET = 978307200  # segundos entre 1970-01-01 y 2001-01-01 UTC
WINDOW = 15                   # minutos antes/después del evento para alertar
DB = Path.home() / "Library/Group Containers/group.com.apple.calendar/Calendar.sqlitedb"

SKIP_KEYWORDS = [
    "concentraci", "focus", "ooo", "fuera de", "out of office",
    "ausencia", "bloqueado", "no molestar", "deep work", "tiempo de trabajo"
]

def should_skip(title):
    return any(k in (title or "").lower() for k in SKIP_KEYWORDS)

def main():
    exclude_names = [c.strip() for c in sys.argv[1].split("|") if c.strip()] if len(sys.argv) > 1 else []

    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end_utc = today_utc + timedelta(days=2)

    cd_now   = now_utc.timestamp()   - CORE_DATA_OFFSET
    cd_start = today_utc.timestamp() - CORE_DATA_OFFSET
    cd_end   = day_end_utc.timestamp() - CORE_DATA_OFFSET

    try:
        conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row

        excluded_ids = []
        if exclude_names:
            ph = ",".join("?" * len(exclude_names))
            rows = conn.execute(f"SELECT ROWID FROM Calendar WHERE title IN ({ph})", exclude_names).fetchall()
            excluded_ids = [r[0] for r in rows]

        query = """
            SELECT DISTINCT summary, start_date FROM CalendarItem
            WHERE start_date >= ? AND start_date < ? AND all_day = 0
        """
        params = [cd_start, cd_end]
        if excluded_ids:
            ph = ",".join("?" * len(excluded_ids))
            query += f" AND calendar_id NOT IN ({ph})"
            params += excluded_ids

        rows = conn.execute(query, params).fetchall()
        conn.close()
    except Exception:
        print("NONE")
        return

    best_diff = None
    best_title = ""

    for row in rows:
        title = row["summary"] or ""
        if should_skip(title):
            continue
        event_utc = row["start_date"] + CORE_DATA_OFFSET
        diff = int((event_utc - now_utc.timestamp()) / 60)
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

if __name__ == "__main__":
    main()

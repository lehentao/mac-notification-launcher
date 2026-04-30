#!/usr/bin/env python3
# Recibe: IDs separados por | y threshold en minutos
# Devuelve: outputs por chico separados por ~ (STATUS|count|name o NONE)
import sqlite3, sys, os, time

DB = os.path.expanduser("~/Library/Application Support/BeeperTexts/index.db")

if len(sys.argv) < 2:
    print("NONE"); sys.exit()

KIDS  = sys.argv[1].split("|")
THRESHOLD = int(sys.argv[2]) if len(sys.argv) > 2 else 5

def check_kid(conn, kid_id):
    rows = conn.execute("""
        SELECT p.full_name, COUNT(*) as cnt
        FROM mx_room_messages m
        JOIN participants p ON m.senderContactID = p.id
        JOIN threads t ON m.roomID = t.threadID
        WHERE m.senderContactID = ?
          AND m.isSentByMe = 0
          AND json_extract(t.thread, '$.unreadCount') > 0
        GROUP BY m.senderContactID
        ORDER BY MAX(m.timestamp) DESC
        LIMIT 1
    """, (kid_id,)).fetchall()
    if not rows:
        return None
    name, count = rows[0]
    return name or "Chico", count

def process(kid_id, idx):
    flag = f"/tmp/kid{idx}_timer"
    try:
        conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
        result = check_kid(conn, kid_id)
        conn.close()
    except Exception:
        return "NONE"

    if result is None:
        if os.path.exists(flag):
            os.remove(flag)
        return "NONE"

    name, count = result
    if not os.path.exists(flag):
        open(flag, 'w').close()
    elapsed = int((time.time() - os.path.getmtime(flag)) / 60)
    status = "CRITICAL" if elapsed >= THRESHOLD else "PENDING"
    return f"{status}|{count}|{name}"

results = [process(kid, i) for i, kid in enumerate(KIDS)]
print("~".join(results))

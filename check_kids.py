#!/usr/bin/env python3
import sqlite3, sys, os

DB = os.path.expanduser("~/Library/Application Support/BeeperTexts/index.db")

# IDs recibidos como argumentos, o valores por defecto
KIDS = sys.argv[1:] if len(sys.argv) > 1 else [
    "@googlechat_107397459185633289427:beeper.local",
    "@googlechat_107972309718912565724:beeper.local",
]

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
        return "NONE"
    name, count = rows[0]
    return f"MSG|{count}|{name or 'Chico'}"

def main():
    try:
        conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    except Exception:
        print("NONE##NONE"); return

    results = [check_kid(conn, kid) for kid in KIDS]
    conn.close()
    print("##".join(results))

if __name__ == "__main__":
    main()

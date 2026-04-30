# ── MeetingBeacon config ──────────────────────────────────────
# Copiá este archivo como config.sh y completá tus valores

# Sensores activos (true/false)
SENSOR_MEET=true
SENSOR_SLACK=true
SENSOR_WHATSAPP=true
SENSOR_GCHAT=true
SENSOR_KIDS=true
SENSOR_BREAK=true

# WhatsApp — JIDs de contactos, separados por | si son varios
WA_CONTACTS="56912345678@s.whatsapp.net"
# WA_CONTACTS="56912345678@s.whatsapp.net|56987654321@s.whatsapp.net"  # ejemplo con varios
WA_THRESHOLD=3          # minutos antes de ponerse rojo

# Chicos — IDs de Google Chat (via Beeper), separados por | si son varios
# Para obtener los IDs: sqlite3 ~/Library/Application\ Support/BeeperTexts/index.db
# "SELECT id, full_name FROM participants WHERE id LIKE '%googlechat%' AND is_network_bot=0;"
KIDS_IDS="@googlechat_XXXXXXXXXXXXXXXXXX:beeper.local"
# KIDS_IDS="@googlechat_XXXXXXXXXXXXXXXXXX:beeper.local|@googlechat_YYYYYYYYYYYYYYYYYY:beeper.local"
KIDS_THRESHOLD=5        # minutos antes de ponerse rojo

# Slack
SLACK_THRESHOLD=10      # minutos antes de ponerse rojo

# Google Chat (trabajo)
GCHAT_THRESHOLD=60      # minutos antes de ponerse rojo

# Break reminder
BREAK_THRESHOLD=120     # minutos de foco antes de alertar
IDLE_THRESHOLD=300      # segundos de inactividad para resetear

# Calendario — calendarios a excluir
CAL_EXCLUDE="Nombre de tu calendario a excluir"

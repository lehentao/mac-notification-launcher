# ── MeetingBeacon config ──────────────────────────────────────
# Copiá este archivo como config.sh y completá tus valores

# WhatsApp — JID de tu contacto (número con código de país, sin +)
WA_CONTACT="56912345678@s.whatsapp.net"
WA_THRESHOLD=3          # minutos antes de ponerse rojo

# Chicos — IDs de Google Chat via Beeper
# Para obtener los IDs: sqlite3 ~/Library/Application\ Support/BeeperTexts/index.db
# "SELECT id, full_name FROM participants WHERE id LIKE '%googlechat%' AND is_network_bot=0;"
KID1_ID="@googlechat_XXXXXXXXXXXXXXXXXX:beeper.local"
KID2_ID="@googlechat_XXXXXXXXXXXXXXXXXX:beeper.local"
KIDS_THRESHOLD=5        # minutos antes de ponerse rojo

# Slack
SLACK_THRESHOLD=10      # minutos antes de ponerse rojo

# Google Chat (trabajo)
GCHAT_THRESHOLD=60      # minutos antes de ponerse rojo

# Break reminder
BREAK_THRESHOLD=120     # minutos de foco antes de alertar
IDLE_THRESHOLD=300      # segundos de inactividad para resetear

# Calendario — calendarios a excluir (separados por coma)
CAL_EXCLUDE="Nombre de tu calendario a excluir"

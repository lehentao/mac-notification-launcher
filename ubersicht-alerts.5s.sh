#!/bin/bash
# Muestra íconos de alertas activas del widget Übersicht
# Se actualiza cada 5s leyendo /tmp/ubersicht_alerts

ICONS=$(cat /tmp/ubersicht_alerts 2>/dev/null | tr -d '\n')

if [ -z "$ICONS" ]; then
    echo ""
    exit 0
fi

echo "$ICONS"
echo "---"
echo "Ver widget | bash='open -a Übersicht'"

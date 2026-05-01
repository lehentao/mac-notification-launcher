// MeetingBeacon.widget/index.jsx
import { run } from 'uebersicht';

export const command = `
CFG="$HOME/.config/meetingbeacon"
source "$CFG/config.sh"

FLAG_SLACK="/tmp/slack_timer"
FLAG_WA="/tmp/wa_timer"
FLAG_GCHAT="/tmp/gchat_timer"
FLAG_BREAK="/tmp/break_timer"

# 1. SENSOR DE REUNIÓN (vía icalBuddy + EventKit)
if [ "$SENSOR_MEET" = "true" ]; then
    if pmset -g assertions | grep -i "Google Chrome" | grep -i "WebRTC" > /dev/null; then
        MEET_OUT="ALIVE"
    else
        MEET_OUT=$(/opt/homebrew/bin/icalBuddy -eep "notes,attendees,location,url" -ea -nc -b ">>>" -ec "$CAL_EXCLUDE" eventsFrom:today to:tomorrow 2>/dev/null | python3 "$CFG/check_calendar.py" 2>/dev/null || echo "NONE")
        [ -z "$MEET_OUT" ] && MEET_OUT="NONE"
    fi
else
    MEET_OUT="NONE"
fi

# 2. SENSOR DE CHICOS (Beeper - Google Chat personal)
if [ "$SENSOR_KIDS" = "true" ] && [ -n "$KIDS_IDS" ]; then
    KIDS_OUT=$(python3 "$CFG/check_kids.py" "$KIDS_IDS" "$KIDS_THRESHOLD" 2>/dev/null || echo "NONE")
else
    KIDS_OUT="NONE"
fi

# 3. SENSOR DE WHATSAPP (solo mensajes de esposa, vía DB nativa)
if [ "$SENSOR_WHATSAPP" = "true" ] && [ -n "$WA_CONTACTS" ]; then
    WA_DB="$HOME/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite"
    WA_JIDS=$(echo "$WA_CONTACTS" | tr '|' '\n' | sed "s/.*/'&'/" | tr '\n' ',' | sed 's/,$//')
    WA_COUNT=$(sqlite3 "$WA_DB" "SELECT COALESCE(SUM(ZUNREADCOUNT),0) FROM ZWACHATSESSION WHERE ZCONTACTJID IN ($WA_JIDS);" 2>/dev/null || echo "0")
    [ -z "$WA_COUNT" ] && WA_COUNT=0
    if [ "$WA_COUNT" -gt 0 ]; then
        if [ ! -f "$FLAG_WA" ]; then touch "$FLAG_WA"; fi
        WA_MINS=$(( ($(date +%s) - $(stat -f %m "$FLAG_WA")) / 60 ))
        if [ "$WA_MINS" -ge "$WA_THRESHOLD" ]; then WA_OUT="CRITICAL|$WA_COUNT"; else WA_OUT="PENDING|$WA_COUNT"; fi
    else
        rm -f "$FLAG_WA"
        WA_OUT="NONE"
    fi
else
    WA_OUT="NONE"
fi

# 4. SENSOR DE GOOGLE CHAT
if [ "$SENSOR_GCHAT" = "true" ]; then
    GCHAT_PID=$(lsappinfo find name="Google Chat" 2>/dev/null)
    if [ -z "$GCHAT_PID" ]; then
        GCHAT_COUNT=0
    else
        GCHAT_COUNT=$(lsappinfo info -only StatusLabel "$GCHAT_PID" | grep -oE '[0-9]+' || echo "0")
    fi
    if [ "$GCHAT_COUNT" -gt 0 ]; then
        if [ ! -f "$FLAG_GCHAT" ]; then touch "$FLAG_GCHAT"; fi
        GCHAT_MINS=$(( ($(date +%s) - $(stat -f %m "$FLAG_GCHAT")) / 60 ))
        if [ "$GCHAT_MINS" -ge "$GCHAT_THRESHOLD" ]; then GCHAT_OUT="CRITICAL|$GCHAT_COUNT"; else GCHAT_OUT="PENDING|$GCHAT_COUNT"; fi
    else
        rm -f "$FLAG_GCHAT"
        GCHAT_OUT="NONE"
    fi
else
    GCHAT_OUT="NONE"
fi

# 5. SENSOR DE SLACK
if [ "$SENSOR_SLACK" = "true" ]; then
    SLACK_PID=$(lsappinfo find name=Slack 2>/dev/null)
    if [ -z "$SLACK_PID" ]; then
        SLACK_COUNT=0
    else
        SLACK_COUNT=$(lsappinfo info -only StatusLabel "$SLACK_PID" | grep -oE '[0-9]+' || echo "0")
    fi
    if [ "$SLACK_COUNT" -gt 0 ]; then
        if [ ! -f "$FLAG_SLACK" ]; then touch "$FLAG_SLACK"; fi
        SLACK_MINS=$(( ($(date +%s) - $(stat -f %m "$FLAG_SLACK")) / 60 ))
        if [ "$SLACK_MINS" -ge "$SLACK_THRESHOLD" ]; then SLACK_OUT="CRITICAL|$SLACK_COUNT"; else SLACK_OUT="PENDING|$SLACK_COUNT"; fi
    else
        rm -f "$FLAG_SLACK"
        SLACK_OUT="NONE"
    fi
else
    SLACK_OUT="NONE"
fi

# 6. BREAK REMINDER (2 horas de focus continuo)
if [ "$SENSOR_BREAK" = "true" ]; then
    IDLE_SECS=$(ioreg -c IOHIDSystem -d 4 | awk '/HIDIdleTime/{print int($NF/1000000000); exit}' 2>/dev/null || echo "0")
    PREV_IDLE=$(cat /tmp/break_prev_idle 2>/dev/null || echo "0")
    echo "$IDLE_SECS" > /tmp/break_prev_idle
    if [ "$IDLE_SECS" -ge "$IDLE_THRESHOLD" ] || [ "$PREV_IDLE" -ge "$IDLE_THRESHOLD" ]; then
        touch "$FLAG_BREAK"
    fi
    if [ ! -f "$FLAG_BREAK" ]; then touch "$FLAG_BREAK"; fi
    BREAK_MINS=$(( ($(date +%s) - $(stat -f %m "$FLAG_BREAK")) / 60 ))
    if [ "$BREAK_MINS" -ge "$BREAK_THRESHOLD" ]; then BREAK_OUT="BREAK|$BREAK_MINS"; else BREAK_OUT="NONE"; fi
else
    BREAK_OUT="NONE"
fi

echo "$MEET_OUT#$SLACK_OUT#$WA_OUT#$GCHAT_OUT#$KIDS_OUT#$BREAK_OUT"
`;

export const refreshFrequency = 12000;

// ── Configuración del render ──────────────────────────────────
const WA_CONFIG = {
  label: "LA JEFA",
  icon: "👸",
  iconPending: "💍",
  iconCritical: "😤",
};

const KIDS = [
  { icon: "👧", fallbackName: "Tsukasa" },
  { icon: "👦", fallbackName: "Luciano" },
];

export const render = ({ output, error }) => {
  if (error || !output) return null;
  const parts = output.trim().split('#');
  if (parts.length < 6) return null;
  const [meetData, slackData, waData, gchatData, kidsRaw, breakData] = parts;
  const kidsData = kidsRaw ? kidsRaw.split('~') : [];

  const getMeetConfig = () => {
    if (meetData === "NONE") return null;
    if (meetData === "ALIVE") return { color: "#00A650", icon: "👥", icon2: "🎙️", label: "EN REUNIÓN", anim: "pulse 2s infinite" };

    const [status, mins, title] = meetData.split('|');
    const m = parseInt(mins);

    if (status === "SOON") {
      const urgent = m <= 1;
      return {
        color: urgent ? "#FF1111" : "#FFDB15",
        icon: "👥", icon2: urgent ? "🚨" : "⌛",
        label: urgent ? "¡AHORA!" : "EN " + m + "m",
        sub: title || null,
        anim: urgent ? "shake 0.5s infinite" : "float 3s infinite"
      };
    }
    if (status === "LATE") {
      return {
        color: "#FF1111",
        icon: "👥", icon2: "🚨",
        label: "TARDE " + m + "m",
        sub: title || null,
        anim: "shake 0.5s infinite"
      };
    }
    return null;
  };

  const getSlackConfig = () => {
    if (slackData === "NONE" || meetData === "ALIVE") return null;
    const [status, count] = slackData.split('|');
    const isRed = status === "CRITICAL";
    return {
      color: isRed ? "#FF1111" : "#FFDB15",
      icon: "💬", icon2: isRed ? "🚨" : undefined,
      label: "SLACK",
      sub: count + " msg",
      anim: isRed ? "shake 0.5s infinite" : "float 3s infinite"
    };
  };

  const getWaConfig = () => {
    if (waData === "NONE") return null;
    const [status, count] = waData.split('|');
    const isRed = status === "CRITICAL";
    return {
      color: isRed ? "#FF1111" : "#25D366",
      icon: WA_CONFIG.icon, icon2: isRed ? WA_CONFIG.iconCritical : WA_CONFIG.iconPending,
      label: WA_CONFIG.label,
      sub: count + " msg",
      anim: isRed ? "shake 0.5s infinite" : "float 3s infinite"
    };
  };

  const getGchatConfig = () => {
    if (gchatData === "NONE" || meetData === "ALIVE") return null;
    const [status, count] = gchatData.split('|');
    const isRed = status === "CRITICAL";
    return {
      color: isRed ? "#FF1111" : "#1A73E8",
      icon: "🗨️", icon2: isRed ? "🚨" : "📨",
      label: "G·CHAT",
      sub: count + " msg",
      anim: isRed ? "shake 0.5s infinite" : "float 3s infinite"
    };
  };

  const getKidConfig = (data, { icon, fallbackName }) => {
    if (data === "NONE") return null;
    const [status, count, name] = data.split('|');
    const isRed = status === "CRITICAL";
    return {
      color: isRed ? "#FF1111" : "#A78BFA",
      icon,
      icon2: isRed ? "🚨" : undefined,
      label: name || fallbackName,
      sub: count + " msg",
      anim: isRed ? "shake 0.5s infinite" : "float 3s infinite"
    };
  };

  const getBreakConfig = () => {
    if (breakData === "NONE" || meetData === "ALIVE") return null;
    const [, mins] = breakData.split('|');
    const h = Math.floor(parseInt(mins) / 60);
    const m = parseInt(mins) % 60;
    const elapsed = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return {
      color: "#4FC3F7",
      icon: "☕", icon2: "🧠",
      label: "DESCANSA",
      sub: elapsed + " en foco",
      anim: "float 3s infinite",
      clickable: true
    };
  };

  const meet  = getMeetConfig();
  const slack = getSlackConfig();
  const wa    = getWaConfig();
  const gchat = getGchatConfig();
  const kids  = kidsData.map((d, i) => getKidConfig(d, KIDS[i] || { icon: "👶", fallbackName: `Hijo ${i + 1}` })).filter(Boolean);
  const brk   = getBreakConfig();

  if (!meet && !slack && !wa && !gchat && !kids.length && !brk) return null;

  const Card = ({ cfg, onClick }) => (
    <div
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        animation: cfg.anim, width: "180px",
        backgroundColor: "rgba(0,0,0,0.75)", borderRadius: "24px", padding: "20px 16px 16px",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 40px " + cfg.color + "30",
        cursor: onClick ? "pointer" : "default"
      }}>
      <div style={{
        width: "120px", height: "120px", borderRadius: "50%", border: "3px solid " + cfg.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 30px " + cfg.color + "50"
      }}>
        {cfg.icon2
          ? <div style={{position:"relative", width:"70px", height:"70px"}}>
              <span style={{fontSize:"52px", position:"absolute", top:0, left:0}}>{cfg.icon}</span>
              <span style={{fontSize:"26px", position:"absolute", bottom:0, right:0}}>{cfg.icon2}</span>
            </div>
          : <span style={{fontSize: "60px"}}>{cfg.icon}</span>
        }
      </div>
      <div style={{ marginTop: "14px", textAlign: "center" }}>
        <div style={{color: cfg.color, fontWeight: "900", fontSize: "13px", letterSpacing: "1px"}}>{cfg.label}</div>
        {cfg.sub && <div style={{color: "white", fontSize: "10px", opacity: 0.7, marginTop: "2px"}}>{cfg.sub}</div>}
        {cfg.clickable && <div style={{color: "rgba(255,255,255,0.4)", fontSize: "9px", marginTop: "6px"}}>clic para resetear</div>}
      </div>
    </div>
  );

  const allCards = [];
  if (meet)  allCards.push({ cfg: meet,  onClick: () => run('open -a "Google Meet"') });
  if (slack) allCards.push({ cfg: slack, onClick: () => run('open -a Slack') });
  if (wa)    allCards.push({ cfg: wa,    onClick: () => run('open -a WhatsApp') });
  if (gchat) allCards.push({ cfg: gchat, onClick: () => run('open -a "Google Chat"') });
  kids.forEach(k => allCards.push({ cfg: k, onClick: () => run('open -a "Beeper Desktop"') }));
  if (brk)   allCards.push({ cfg: brk,  onClick: () => run('touch /tmp/break_timer') });

  const rows = [];
  for (let i = 0; i < allCards.length; i += 3) rows.push(allCards.slice(i, i + 3));

  return (
    <div style={{
      position: "absolute", top: "50vh", left: "50vw", transform: "translate(-50%, -50%)",
      display: "flex", flexDirection: "column", gap: "30px", alignItems: "center",
      fontFamily: "-apple-system, system-ui"
    }}>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-3px, -1px) rotate(-1deg); }
          20% { transform: translate(3px, 0px) rotate(1deg); }
          30% { transform: translate(-3px, 1px) rotate(0deg); }
          40% { transform: translate(3px, -1px) rotate(1deg); }
          50% { transform: translate(-2px, 1px) rotate(-1deg); }
          60% { transform: translate(2px, 0px) rotate(0deg); }
          70% { transform: translate(-2px, -1px) rotate(-1deg); }
          80% { transform: translate(2px, 1px) rotate(1deg); }
          90% { transform: translate(-1px, 0px) rotate(0deg); }
        }
      `}</style>

      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: "30px", justifyContent: "center" }}>
          {row.map((card, ci) => <Card key={ci} cfg={card.cfg} onClick={card.onClick} />)}
        </div>
      ))}
    </div>
  );
};

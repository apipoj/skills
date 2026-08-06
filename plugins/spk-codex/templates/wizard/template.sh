#!/usr/bin/env bash
#
# wizard — พาคนทำขั้นตอนที่ต้องทำเองทีละขั้น
# สร้างโดย skill /wizard
#
# ทุกอย่างเหนือ marker STAGES ด้านล่างคือไลบรารีของ wizard ห้ามแก้ด้วยมือ
# ให้เขียนเฉพาะ stage ของแต่ละขั้นตอนใต้ marker เท่านั้น

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# ไลบรารีของ wizard — UX เหมือนกันทุกตัว ห้ามแก้ส่วนนี้
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

# ผู้เขียน wizard ตั้งค่านี้ที่ต้นส่วน stages
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEY ที่เขียนลง ENV_FILE ในรอบนี้
WRITTEN_SECRET=() # ชื่อ secret ที่ตั้งค่าในรอบนี้
SKIPPED=()        # สิ่งที่ทำไม่ได้ เช่น ไม่มี gh

# _clear — ล้างหน้าจอให้เหลือเฉพาะขั้นตอนปัจจุบัน
# ถ้า output ไม่ใช่ terminal จะไม่ทำอะไร เพื่อให้ log ที่ pipe ไว้อ่านได้
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

# banner "หัวข้อ" — หน้าเปิด บอกว่า wizard นี้ทำอะไร
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s ขั้นตอน%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  คุณเป็นคนกด browser เอง wizard จะบอกว่าต้องทำอะไรและเก็บค่าที่คุณ\n' "$DIM"
  printf '  copy กลับมาให้ หยุดกลางทางด้วย Ctrl-C ได้ แล้วค่อยรันใหม่ทีหลัง\n'
  printf '  ค่าที่บันทึกไปแล้วจะยังอยู่%s\n' "$RESET"
  pause "พร้อมเริ่มหรือยัง?"
}

# stage "ชื่อขั้น" — ล้างหน้าจอ แล้วประกาศขั้นตอนพร้อมความคืบหน้า
# การล้างหน้าจอทำให้เหลือเฉพาะขั้นที่กำลังทำอยู่
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ ขั้นที่ %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." — บรรทัดคำอธิบายธรรมดา
say()  { printf '  %s\n' "$1"; }
# step "..." — สิ่งที่คนต้องลงมือทำใน browser
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL — เปิด browser ให้ ใช้ได้ทุก platform รวม WSL
open_url() {
  local url="$1"
  printf '  %s↗ กำลังเปิด%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else warn "เปิด browser ไม่ได้ เปิดเองที่: $url"; fi
  } >/dev/null 2>&1 || warn "เปิด browser ไม่ได้ เปิดเองที่: $url"
}

# pause "ข้อความ" — รอให้คนยืนยันว่าทำส่วนที่ต้องทำเองเสร็จแล้ว
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-กด Enter เพื่อไปต่อ}" "$RESET"
  read -r _ || true
}

# confirm "คำถาม" — ประตู y/N คืนค่าสำเร็จเมื่อตอบ yes
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY — ค่าปัจจุบันของ KEY ใน ENV_FILE ถ้ามี
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

# ask KEY "คำถาม" — อ่านค่าเข้า $KEY ถ้ารันซ้ำจะเสนอค่าเดิมใน .env เป็น default
# (กด Enter เพื่อใช้ค่าเดิม) พิมพ์แล้วเห็นตัวอักษร ใช้กับค่าที่ไม่ใช่ความลับ
ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[กด Enter เพื่อใช้ค่าเดิม]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "คำถาม" — เหมือน ask แต่ซ่อนสิ่งที่พิมพ์ ใช้กับความลับเสมอ
ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[กด Enter เพื่อใช้ค่าเดิม]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE — upsert KEY=VALUE ลง ENV_FILE (สร้างไฟล์ให้ถ้ายังไม่มี
# และแทนที่บรรทัดเดิม) รันซ้ำได้ผลเหมือนเดิม
write_env() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ บันทึก%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE — ตั้ง GitHub Actions repo secret ผ่าน gh
# ถ้าไม่มี gh หรือยังไม่ได้ login จะเตือนและจดไว้ในสรุปท้ายสุด
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ ตั้งค่า%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (ตั้งเองด้วย: gh secret set $name)")
  warn "ข้าม GitHub secret $name — gh ยังไม่พร้อม ค่อยตั้งทีหลัง"
}

# set_var NAME VALUE — ตั้ง GitHub Actions repo variable (ไม่ใช่ความลับ)
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ ตั้งค่า%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "ข้าม GitHub variable $name — gh ยังไม่พร้อม ค่อยตั้งทีหลัง"
}

# finish — ล้างหน้าจอ แล้วสรุปทุกอย่างที่ตั้งค่าไป
finish() {
  _clear
  printf '\n%s%s  ✓ ตั้งค่าเสร็จแล้ว%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "เขียน ${#WRITTEN_ENV[@]} ค่าลง $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "ตั้ง GitHub secret ${#WRITTEN_SECRET[@]} ตัว: ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "ยังต้องทำเองอีก:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# === STAGES === (ห้ามแก้ไขไลบรารีเหนือบรรทัดนี้)
# เขียนส่วนนี้เอง หนึ่ง stage() ต่อหนึ่งขั้นที่คนต้องทำ
# แทนที่ตัวอย่างด้านล่าง และตั้ง TOTAL_STAGES ให้ตรงกับจำนวน stage ที่เขียน
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=1

banner "ตั้งค่า Stripe"

# ── ตัวอย่าง stage: แทนที่ด้วยขั้นตอนจริง ─────────────────────────────────
stage "Stripe — API keys"
say "จะไปเอา Stripe test key มาเก็บไว้ใช้ตอน dev และใน CI"
open_url "https://dashboard.stripe.com/test/apikeys"
step "ที่หน้า API keys ให้ copy Publishable key (ขึ้นต้นด้วย pk_test_)"
ask STRIPE_PUBLISHABLE_KEY "วาง publishable key:"
step "กด 'Reveal test key' ที่แถว Secret key แล้ว copy มา"
ask_secret STRIPE_SECRET_KEY "วาง secret key:"
write_env STRIPE_PUBLISHABLE_KEY "$STRIPE_PUBLISHABLE_KEY"
write_env STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
set_secret STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"   # CI ต้องใช้ตัวนี้
# ──────────────────────────────────────────────────────────────────────────

finish

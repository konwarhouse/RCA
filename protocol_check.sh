#!/bin/bash
# Universal Protocol Compliance Check Script
# ZERO TOLERANCE ENFORCEMENT SYSTEM

VIOLATIONS=0

echo "🔍 Universal Protocol Compliance Check - ZERO TOLERANCE ENFORCEMENT"
echo "=================================================================="
echo ""
echo "📋 VITE PROXY COMPLIANCE INSTRUCTIONS:"
echo "• ALL API calls must use relative paths: /api/route"
echo "• NO hardcoded ports or absolute URLs in client code"
echo "• Check vite.config.ts proxy config for /api routes"
echo "• Run this script before EVERY commit/push"
echo "• ZERO TOLERANCE: Fix ALL violations before proceeding"
echo "=================================================================="
echo ""

# Comprehensive forbidden patterns with zero tolerance
PATTERNS=(
  "process\.env\[\.OPENAI_API_KEY"
  "process\.env\.OPENAI_API_KEY"
  "API_KEY[ =:]"
  "Date\.now\(\)"
  "Math\.random\(\)"
  "localhost"
  "127\.0\.0\.1"
  "http[s]?://[^\"]*"
  "MAX_[A-Z_]+ ?= ?[0-9]+"
  "MIN_[A-Z_]+ ?= ?[0-9]+"
  "hardcoded"
  "magic number"
  "sk-[a-zA-Z0-9]{32,}"
  "sk-proj-[a-zA-Z0-9]+"
  "gpt-[34]"
  "openai"
  "claude-3"
  "model.*:"
  "provider.*:"
  "randomUUID\(\)"
  "crypto\.randomBytes"
)

CRITICAL_PATTERNS=(
  "Date\.now\(\)"
  "Math\.random\(\)"
  "process\.env\.OPENAI_API_KEY"
  "sk-[a-zA-Z0-9]{32,}"
)

echo "Scanning server/, client/, and shared/ directories..."

for pattern in "${PATTERNS[@]}"; do
  echo "Checking pattern: $pattern"
  MATCHES=$(grep -Prn "$pattern" ./server ./client ./shared 2>/dev/null | grep -v "NO.*hardcoded" | grep -v "Universal Protocol Standard" | grep -v "protocol_check" | grep -v "replit-dev-banner" | grep -v "process\.env\.[A-Z_]*_URL.*https" | grep -v "^.*//.*$pattern" | grep -v "^\s*\*.*$pattern" | grep -v "\- NO hardcoded" | grep -v "appears to be hardcoded" | grep -v "hardcoded-violation" | grep -v "Detects hardcoded" | grep -v "hardcodedPatterns")
  if [ -n "$MATCHES" ]; then
    echo "🚨 CRITICAL VIOLATION FOUND: $pattern"
    echo "$MATCHES"
    VIOLATIONS=1
  fi
done

# Check for missing protocol headers
echo ""
echo "Checking for missing Universal Protocol Standard headers..."
find ./server -name "*.ts" -not -path "./server/node_modules/*" | while read file; do
  if ! grep -q "UNIVERSAL PROTOCOL STANDARD" "$file" && ! grep -q "Protocol:" "$file"; then
    echo "⚠️  Missing protocol header in: $file"
  fi
done

if [ "$VIOLATIONS" -eq 1 ]; then
  echo ""
  echo "🚨 CRITICAL PROTOCOL VIOLATIONS DETECTED!"
  echo "======================================="
  echo "❌ Zero tolerance policy violated"
  echo "❌ All violations must be fixed immediately"
  echo "❌ Blocking all operations until resolved"
  echo ""
  exit 1
else
  echo ""
  echo "✅ UNIVERSAL PROTOCOL COMPLIANCE VERIFIED"
  echo "========================================"
  echo "✅ Zero hardcoding violations detected"
  echo "✅ All patterns checked successfully"
  echo "✅ Ready for production deployment"
  echo ""
  exit 0
fi
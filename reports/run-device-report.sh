#!/usr/bin/env bash
# Full-site device report runner for Event Tickets
# Usage: ./reports/run-device-report.sh [URL] [OUTPUT]
#
# Crawls the deployed site and generates a 3-device report:
#   - iPhone 15 Pro (390px)
#   - iPad Pro 13" (1024px landscape)
#   - Desktop 2K (2560px)
#
# Related to #1

SITE_URL="${1:-https://alphinium-template-event-tickets-c1ew9noj.user-pods.alphinium.io}"
OUTPUT="${2:-reports/full-site-device-report.html}"

echo "🌐 Running full-site device report for: $SITE_URL"
echo "📄 Output: $OUTPUT"

xvfb-run --auto-servernum python3 \
  /opt/alphinium-agent-tools/dev-tools/valerie/tools/full-site-device-report.py \
  "$SITE_URL" \
  --output "$OUTPUT" \
  --max-pages 50

echo "✅ Done — report saved to $OUTPUT"

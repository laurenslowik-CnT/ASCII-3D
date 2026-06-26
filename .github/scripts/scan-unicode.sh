#!/usr/bin/env bash
#
# scan-unicode.sh — scan agent skill files for invisible Unicode attacks
# (Trojan Source / Glassworm). Writes JSON results to scan-output.txt and
# exposes the scanner exit code as the `exit_code` GitHub Actions step output.
#
# Glob covers both Cursor and Claude Code agent skills. A generic
# '**/skills/**/*' does NOT descend into dot-directories, so the dirs must be
# named explicitly via brace expansion.
set +e
npx --yes anti-trojan-source --files='{.cursor,.claude}/skills/**/*' --json > scan-output.txt 2>npx-stderr.txt
EC=$?
echo "exit_code=$EC" >> "$GITHUB_OUTPUT"
cat scan-output.txt

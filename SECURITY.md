# Security

## Reporting a vulnerability

Report suspected vulnerabilities to aidata@codeandtheory.com. Do not open a public issue for anything exploitable.

## Layers of protection

This repo ships with a security baseline. That baseline presents layers of independent controls, each of which fails safe.

### Layer 1 — Keep secrets out of the repo

Real secrets live in `.env` (git-ignored) and are documented, value-free, in
`.env.example`. If a secret is never committed, no assistant can read it.

### Layer 2 — Exclude secrets from coding assistants

Each assistant uses a different mechanism. The baseline ships the right artifact
for each, with the same secret-pattern set:

| Assistant                    | Mechanism shipped                                  | Notes / caveats                                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| git / most tools             | `.gitignore`                                       | Most assistants also respect this.                                                                                                                                                                        |
| Cursor                       | `.cursorignore`                                    | Hard block (AI access + indexing), but **"best effort"** — terminal commands and MCP tool calls run outside Cursor's file controls and may still read matched files. Changes need a terminal restart.     |
| Claude Code                  | `.claude/settings.json` → `permissions.deny`       | `.claudeignore` is _not_ reliable (Claude Code can still read matched files), so it's shipped only for forward-compatibility. Deny rules combine across org/project and can't be undone by a local allow. |
| Gemini Code Assist           | `.aiexclude`                                       | Same syntax as `.gitignore`; overrides `.gitignore` on conflict.                                                                                                                                          |
| Gemini CLI                   | `.geminiignore`                                    | The CLI uses this rather than `.aiexclude`.                                                                                                                                                               |
| Windsurf / Codeium (Cascade) | `.codeiumignore`                                   |                                                                                                                                                                                                           |
| Cline                        | `.clineignore`                                     |                                                                                                                                                                                                           |
| GitHub Copilot               | **Settings → Content exclusion** (not a repo file) | Configure org-wide; see `docs/security/copilot-content-exclusion.yml` for a paste-ready block. **Does not apply** to Copilot CLI, the coding agent, or Agent mode in Chat.                                |

---

#### Single source of truth for excluded files

Each assistant uses a different syntax (gitignore globs, Claude `Read(...)` deny
rules, Copilot YAML with `**/` prefixes). Hand-syncing every file is how the
floor drifts and silently weakens. So the patterns live in exactly one place
and a generator renders every target from it:

- **Source of truth:** [`.github/scripts/secret-patterns.txt`](./.github/scripts/secret-patterns.txt) — one canonical gitignore-style pattern per line.
- **Generator:** [`.github/scripts/sync-ignores.mjs`](./.github/scripts/sync-ignores.mjs) — rewrites the managed block in each ignore file, regenerates `permissions.deny` in `.claude/settings.json`, and rewrites the Copilot YAML list. Per-target transforms (e.g. `secrets/` → `Read(secrets/**)` for Claude, `**/secrets/**` for Copilot) live in the script.
- **Coexistence:** in text files, the script owns only the delimited region between `# === BEGIN SECURITY FLOOR ===` and `# === END SECURITY FLOOR ===` markers. Headers, `.gitignore`'s other sections are preserved verbatim. In `.claude/settings.json` the equivalent is structural and the floor is a _minimum_: the generated `Read(...)` rules must all be present and unmodified in `permissions.deny`, but developers may add stricter deny rules (e.g. `Bash(git push --force)`) and those extras are preserved by the generator and tolerated by `--check`. The floor can be made more restrictive locally, never less.
- **CI enforcement:** Security Floor runs `sync-ignores.mjs --check`, which fails the build if any target has drifted from the master list.

---

To add or change a pattern: edit `secret-patterns.txt`, run
`node .github/scripts/sync-ignores.mjs`, and commit the result. Never hand-edit
the managed blocks — CI will reject it.

---

### Layer 3 — Screen what agents ingest and catch what slips through

CI workflows (all in `.github/workflows/`):

- **Unicode Security Scan** — detects invisible/bidirectional Unicode
  (Trojan Source / Glassworm-style) in agent skills under `.cursor/skills/` and
  `.claude/skills/`. Fails the build on detection.
- **Secret Scan** — gitleaks over full history, in case a credential is
  committed despite Layer 1.
- **Dependency Scan** — OSV-Scanner against lockfiles for known-vulnerable or
  malicious packages (the other half of the supply-chain threat).
- **Security Floor** — runs `.github/scripts/sync-ignores.mjs --check` to
  assert every Layer-2 target is in sync with the master pattern list and
  hasn't been removed, negated, or weakened over time.

## If you must change a security-floor file

For pattern changes (adding, removing, or modifying a secret pattern), edit [`.github/scripts/secret-patterns.txt`](./.github/scripts/secret-patterns.txt) and run `node .github/scripts/sync-ignores.mjs` to regenerate every target. Commit both the master list and the regenerated files together. Do not hand-edit content inside the `# === SECURITY FLOOR ===` markers, and do not remove or weaken any of the generated `Read(...)` rules in `permissions.deny` — the next `--check` run will fail. You _may_ add your own stricter `permissions.deny` rules (e.g. `Bash(...)`) on top of the floor; those are preserved and pass the check.

For any other security-floor file (workflows, CODEOWNERS, etc.), open a PR; it
will be routed to the DevOps team and the Security Floor check will flag any weakening.

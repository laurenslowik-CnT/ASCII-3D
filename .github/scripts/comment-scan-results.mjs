//
// comment-scan-results.mjs — post (or update) the Unicode Security Scan result
// as a PR comment. Invoked from the workflow via actions/github-script, which
// supplies the Octokit `github` client and `context`.
//
// Reads the scanner JSON from scan-output.txt and the scanner exit code from
// the SCAN_EXIT_CODE environment variable.

import fs from "node:fs";

const MARKER = "<!-- unicode-security-scan -->";
const HEADING = "## Unicode Security Scan";
const PASS_LINE = "✅ No Unicode security issues detected";
const FAIL_LINE = "❌ Unicode security scan reported issues";

function formatLocation(line, column) {
  if (line == null) {
    return "";
  }
  if (column == null) {
    return `Line ${line}`;
  }
  return `Line ${line}, column ${column}`;
}

function formatFindings(entry) {
  const lines = [`**${entry.file}**`];
  for (const f of entry.findings) {
    const loc = formatLocation(f.line, f.column);
    const core = [f.codePoint, f.name].filter(Boolean).join(" — ");
    lines.push(loc ? `- ${loc}: ${core}` : `- ${core}`);
  }
  return lines.join("\n");
}

function doesDataPass(data) {
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  return data != null && typeof data === "object" && data.success === true;
}

function formatDetail(data) {
  if (Array.isArray(data)) {
    const blocks = data
      .filter(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          entry.file &&
          Array.isArray(entry.findings),
      )
      .map(formatFindings);
    return blocks.length > 0 ? "\n\n" + blocks.join("\n\n") : ""; // eslint-disable-line prefer-template
  }
  const isSimpleMessage =
    data &&
    typeof data === "object" &&
    typeof data.message === "string" &&
    data.success !== true;
  if (isSimpleMessage) {
    return `\n\n${data.message}`;
  }
  return "";
}

function formatBody(raw, ec) {
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    const status = ec === "0" ? PASS_LINE : FAIL_LINE;
    const extra = raw
      ? `\n\n<details><summary>Raw output</summary>\n\n\`\`\`\n${raw}\n\`\`\`\n\n</details>`
      : "";
    return `${MARKER}\n${HEADING}\n\n${status}${extra}`;
  }

  if (ec === "0" && doesDataPass(data)) {
    return `${MARKER}\n${HEADING}\n\n${PASS_LINE}`;
  }

  const detail = formatDetail(data);
  return `${MARKER}\n${HEADING}\n\n${FAIL_LINE}${detail}`;
}

export default async function commentScanResults({ github, context }) {
  const raw = fs.readFileSync("scan-output.txt", "utf8").trim();
  const ec = process.env.SCAN_EXIT_CODE ?? "";
  const body = formatBody(raw, ec);

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
  });

  const existing = comments.find((c) => c.body && c.body.includes(MARKER));

  const fn = existing
    ? github.rest.issues.updateComment
    : github.rest.issues.createComment;
  const kwarg = existing
    ? { comment_id: existing.id }
    : { issue_number: context.issue.number };
  await fn({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ...kwarg,
    body,
  });
}

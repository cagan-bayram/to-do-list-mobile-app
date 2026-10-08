// The app and hosted policy share one source so their wording stays identical.
const fs = require("node:fs");
const path = require("node:path");
const policy = require("../src/content/privacy-policy.json");
const projectRoot = path.resolve(__dirname, "..");

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

const sections = policy.sections.map((section) => `    <section>
      <h2>${escapeHtml(section.title)}</h2>
${section.paragraphs.map((paragraph) => `      <p>${escapeHtml(paragraph)}</p>`).join("\n")}
    </section>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="How ToDoo handles task data, local reminders, device backups and privacy questions.">
  <title>${escapeHtml(policy.title)}</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1c3028; background: #f6f7f2; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { max-width: 760px; margin: 0 auto; padding: 48px 24px 64px; }
    .brand { color: #245b45; font-weight: 700; letter-spacing: .04em; }
    h1 { font-size: clamp(2rem, 7vw, 3rem); line-height: 1.15; margin: 12px 0 16px; }
    h2 { font-size: 1.3rem; line-height: 1.4; margin: 0 0 12px; }
    p { font-size: 1rem; line-height: 1.75; margin: 12px 0; }
    .updated { color: #647269; margin-bottom: 28px; }
    .summary { padding: 20px 24px; border-radius: 20px; background: #e6f0e9; }
    .summary p { margin: 0; }
    section { margin-top: 32px; }
    .contact { padding: 24px; border-radius: 20px; background: white; border: 1px solid #dce3dc; }
    a { color: #245b45; overflow-wrap: anywhere; text-underline-offset: 3px; }
    a:focus-visible { outline: 3px solid #245b45; outline-offset: 5px; }
    @media print { main { max-width: none; padding: 0; } body, .summary, .contact { background: white; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">${escapeHtml(policy.appName)}</div>
      <h1>Privacy Policy</h1>
      <p class="updated">Last updated: ${escapeHtml(policy.lastUpdated)}</p>
    </header>
    <div class="summary"><p>${escapeHtml(policy.summary)}</p></div>
${sections}
    <section class="contact">
      <h2>Contact</h2>
      <p>${escapeHtml(policy.developer)}<br><a href="mailto:${escapeHtml(policy.contactEmail)}">${escapeHtml(policy.contactEmail)}</a></p>
    </section>
  </main>
</body>
</html>
`;

const markdown = [
  `# ${policy.title}`,
  `Last updated: ${policy.lastUpdated}`,
  policy.summary,
  ...policy.sections.flatMap((section) => [`## ${section.title}`, ...section.paragraphs]),
  "## Contact",
  policy.developer,
  `[${policy.contactEmail}](mailto:${policy.contactEmail})`,
].join("\n\n") + "\n";

fs.mkdirSync(path.join(projectRoot, "docs"), { recursive: true });
fs.writeFileSync(path.join(projectRoot, "docs", "privacy-policy.html"), html);
fs.writeFileSync(path.join(projectRoot, "PRIVACY_POLICY.md"), markdown);
console.log("Updated docs/privacy-policy.html and PRIVACY_POLICY.md.");

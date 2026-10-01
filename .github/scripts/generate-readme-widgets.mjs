#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const USER = process.env.GITHUB_USER || "Eagl3Eyes";
const LEETCODE_USER = process.env.LEETCODE_USER || "tuhinjobayer";
const TOKEN = process.env.GITHUB_TOKEN || "";
const OUT_DIR = process.argv[2] || "dist";

const W = 440;
const H = 175;
const FONT = "'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
const COLORS = {
  Easy: "#2dd4bf",
  Medium: "#58a6ff",
  Hard: "#ff7eb6",
};

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (n) => n.toLocaleString("en-US");

function textWidth(s, size) {
  let w = 0;
  for (const ch of String(s)) {
    let f;
    if ("iljI.,'!|;:".includes(ch)) f = 0.28;
    else if (/[0-9\-–—/ ]/.test(ch)) f = 0.5;
    else if ("mwMW@%&".includes(ch)) f = 0.86;
    else if (/[A-Z]/.test(ch)) f = 0.66;
    else f = 0.55;
    w += f * size;
  }
  return w;
}

function truncate(s, size, maxW) {
  s = String(s);
  if (textWidth(s, size) <= maxW) return s;
  let out = "";
  for (const ch of s) {
    if (textWidth(out + ch + "...", size) > maxW) break;
    out += ch;
  }
  return `${out}...`;
}

async function withRetry(label, fn, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.log(`${label}: attempt ${i}/${tries} failed - ${err.message}`);
      if (i < tries) await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw new Error(`${label} failed after ${tries} attempts: ${lastErr.message}`);
}

function relTime(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo ago`;
  return `${Math.floor(s / (86400 * 365))}y ago`;
}

const LANG_COLORS = {
  typescript: "#3178c6",
  javascript: "#f1e05a",
  python: "#3572a5",
  java: "#b07219",
  "c#": "#178600",
  "c++": "#f34b7d",
  c: "#894f2b",
  go: "#00add8",
  rust: "#dea584",
  php: "#4f5d95",
  ruby: "#701516",
  swift: "#f05138",
  kotlin: "#a97bff",
  dart: "#00b4ab",
  html: "#e34c26",
  css: "#563d7c",
  shell: "#89e051",
  powershell: "#012456",
  vue: "#41b883",
  svelte: "#ff3e00",
  markdown: "#083fa1",
};

function readable(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum >= 0.45) return hex;
  const mix = 0.55;
  const to = (c) => Math.round(c + (255 - c) * mix);
  return `#${[to(r), to(g), to(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function frame(title, body) {
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-label="${esc(title)}">`
  );
  parts.push(`<title>${esc(title)}</title>`);
  parts.push(`<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#58a6ff">
        <animate attributeName="stop-color" values="#58a6ff;#bf91f3;#ff7eb6;#2dd4bf;#58a6ff" dur="10s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="#bf91f3">
        <animate attributeName="stop-color" values="#bf91f3;#ff7eb6;#2dd4bf;#58a6ff;#bf91f3" dur="10s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ff7eb6">
        <animate attributeName="stop-color" values="#ff7eb6;#2dd4bf;#58a6ff;#bf91f3;#ff7eb6" dur="10s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>`);
  parts.push(`<rect width="${W}" height="${H}" rx="18" fill="url(#bg)"/>`);
  parts.push(
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="none" stroke="#30363d"/>`
  );
  parts.push(
    `<text x="${W / 2}" y="30" text-anchor="middle" font-size="14" font-weight="800" letter-spacing="2" fill="url(#grad)" filter="url(#glow)" opacity="0.5">${esc(title)}</text>`
  );
  parts.push(
    `<text x="${W / 2}" y="30" text-anchor="middle" font-size="14" font-weight="800" letter-spacing="2" fill="url(#grad)">${esc(title)}</text>`
  );
  parts.push(
    `<rect x="${W / 2 - 40}" y="39" width="80" height="2.5" rx="1.25" fill="url(#grad)">
      <animate attributeName="opacity" values="1;0.35;1" dur="4s" repeatCount="indefinite"/>
    </rect>`
  );
  parts.push(body);
  parts.push(`</svg>`);
  return parts.join("\n");
}

async function fetchLeetcode() {
  const query = `query($u:String!){matchedUser(username:$u){profile{ranking}submitStatsGlobal{acSubmissionNum{count difficulty}totalSubmissionNum{count difficulty}}}}`;
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "readme-widget-generator" },
    body: JSON.stringify({ query, variables: { u: LEETCODE_USER } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  const m = json.data?.matchedUser;
  if (!m) throw new Error("no matchedUser");
  const ac = Object.fromEntries(m.submitStatsGlobal.acSubmissionNum.map((d) => [d.difficulty, d.count]));
  const total = m.submitStatsGlobal.totalSubmissionNum.find((d) => d.difficulty === "All")?.count || 0;
  const allAc = ac.All || 0;
  const acceptance = total ? ((allAc / total) * 100).toFixed(1) : "0";
  return { solved: allAc, Easy: ac.Easy || 0, Medium: ac.Medium || 0, Hard: ac.Hard || 0, acceptance, ranking: m.profile?.ranking || 0 };
}

function renderLeetcode(d) {
  const body = [];
  body.push(
    `<text x="40" y="112" font-size="52" font-weight="800" fill="#e6edf3">${d.solved}</text>`
  );
  body.push(`<text x="42" y="136" font-size="13" fill="#8b949e">problems solved</text>`);

  const rows = ["Easy", "Medium", "Hard"];
  const ys = [72, 98, 124];
  rows.forEach((label, i) => {
    const y = ys[i];
    body.push(`<circle cx="256" cy="${y - 4}" r="5" fill="${COLORS[label]}"/>`);
    body.push(`<text x="270" y="${y}" font-size="13" fill="#8b949e">${label}</text>`);
    body.push(
      `<text x="416" y="${y}" font-size="15" font-weight="700" fill="#e6edf3" text-anchor="end">${d[label]}</text>`
    );
  });

  body.push(
    `<text x="${W / 2}" y="160" font-size="12" fill="#8b949e" text-anchor="middle">Acceptance ${d.acceptance}% &#183; Ranking #${fmt(d.ranking)}</text>`
  );
  return frame("LEETCODE STATS", body.join("\n"));
}

async function fetchRepos() {
  const headers = { accept: "application/vnd.github+json", "user-agent": "readme-widget-generator" };
  if (TOKEN) headers.authorization = `bearer ${TOKEN}`;
  const res = await fetch(
    `https://api.github.com/users/${USER}/repos?sort=updated&per_page=30`,
    { headers }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const repos = await res.json();
  if (!Array.isArray(repos)) throw new Error("unexpected response");
  return repos
    .filter((r) => !r.fork && !r.archived && r.name.toLowerCase() !== USER.toLowerCase())
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      lang: r.language || "",
      pushed: r.pushed_at,
      time: relTime(r.pushed_at),
    }));
}

function renderRepos(repos) {
  const body = [];
  const ys = [64, 88, 112, 136, 160];
  repos.forEach((r, i) => {
    const y = ys[i];
    const rightText = r.lang ? `${r.lang} · ${r.time}` : r.time;
    const rightW = textWidth(rightText, 11);
    const rightStart = 416 - rightW;
    const dotX = rightStart - 14;
    const nameMax = (r.lang ? dotX - 8 : rightStart - 12) - 28;
    body.push(
      `<text x="28" y="${y}" font-size="13" font-weight="600" fill="#e6edf3">${esc(truncate(r.name, 13, nameMax))}</text>`
    );
    if (r.lang) {
      const color = readable(LANG_COLORS[r.lang.toLowerCase()] || "#8b949e");
      body.push(`<circle cx="${dotX}" cy="${y - 4}" r="4.5" fill="${color}"/>`);
    }
    body.push(
      `<text x="416" y="${y}" font-size="11" fill="#8b949e" text-anchor="end">${esc(rightText)}</text>`
    );
  });
  return frame("RECENT REPOS", body.join("\n"));
}

const [lc, repos] = await Promise.all([
  withRetry("leetcode", fetchLeetcode),
  withRetry("github-repos", fetchRepos),
]);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/leetcode-card.svg`, renderLeetcode(lc));
writeFileSync(`${OUT_DIR}/recent-repos.svg`, renderRepos(repos));
console.log(
  `wrote leetcode-card.svg (solved=${lc.solved} accept=${lc.acceptance}% rank=${lc.ranking}) and recent-repos.svg (${repos.map((r) => r.name).join(", ")})`
);

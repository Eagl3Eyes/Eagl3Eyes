#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const USER = process.env.GITHUB_USER || "Eagl3Eyes";
const TOKEN = process.env.GITHUB_TOKEN || "";
const OUT = process.argv[2] || "dist/contribution-graph.svg";

const W = 880;
const CELL = 11;
const GAP = 4;
const PITCH = CELL + GAP;
const GRID_X = 58;
const GRID_Y = 70;
const ROWS = 7;
const H = 208;

const FONT = "'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
const COLORS = ["#161b22", "#2dd4bf", "#58a6ff", "#bf91f3", "#ff7eb6"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const DAY_MS = 86400000;

const dayIdx = (date) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const fmt = (n) => n.toLocaleString("en-US");

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionLevel
            contributionCount
          }
        }
      }
    }
  }
}`;

async function fetchGraphQL() {
  if (!TOKEN) {
    console.log("no GITHUB_TOKEN, skipping GraphQL");
    return null;
  }
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        authorization: `bearer ${TOKEN}`,
        "content-type": "application/json",
        "user-agent": "contribution-graph-generator",
      },
      body: JSON.stringify({ query: QUERY, variables: { login: USER } }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal) throw new Error("no calendar in response");
    const cells = cal.weeks
      .flatMap((w) => w.contributionDays)
      .map((d) => ({ date: d.date, level: LEVELS[d.contributionLevel] ?? 0 }));
    console.log(`graphql ok: total=${cal.totalContributions} cells=${cells.length}`);
    return { total: cal.totalContributions, cells };
  } catch (err) {
    console.log(`graphql failed: ${err.message}, falling back to HTML`);
    return null;
  }
}

async function fetchHtml() {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, {
    headers: { "user-agent": "contribution-graph-generator", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`contributions page HTTP ${res.status}`);
  const html = await res.text();

  const cells = [];
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const level = /\bdata-level="(\d)"/.exec(m[0]);
    if (level) cells.push({ date: m[1], level: +level[1] });
  }
  if (!cells.length) throw new Error("no cells parsed from HTML");

  const text = html.replace(/<[^>]+>/g, " ");
  const total = /([\d,]+)\s+contributions?\s+in the last year/.exec(text);
  if (!total) throw new Error("total not found in HTML");
  return { total: +total[1].replace(/,/g, ""), cells };
}

function buildSvg({ total, cells }) {
  const idx = cells.map((c) => dayIdx(c.date));
  const minIdx = Math.min(...idx);
  const maxIdx = Math.max(...idx);
  const snapWeekday = new Date(minIdx * DAY_MS).getUTCDay();
  const gridStart = minIdx - snapWeekday;
  const numCols = Math.floor((maxIdx - gridStart) / 7) + 1;

  const gridW = numCols * PITCH - GAP;
  const gridRight = GRID_X + gridW;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`
  );
  parts.push(`<title>${fmt(total)} contributions in the last year</title>`);
  parts.push(`<rect width="${W}" height="${H}" rx="18" fill="#0d1117"/>`);
  parts.push(
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="none" stroke="#30363d"/>`
  );
  parts.push(
    `<text x="24" y="36" font-size="15"><tspan font-weight="600" fill="#e6edf3">${fmt(total)}</tspan>` +
      `<tspan fill="#8b949e"> contributions in the last year</tspan></text>`
  );

  const firstYear = new Date(gridStart * DAY_MS).getUTCFullYear();
  const lastYear = new Date(maxIdx * DAY_MS).getUTCFullYear();
  const used = new Set();
  for (let y = firstYear; y <= lastYear; y++) {
    for (let m = 0; m < 12; m++) {
      const mStart = Math.floor(Date.UTC(y, m, 1) / DAY_MS);
      const mEnd = Math.floor(Date.UTC(y, m + 1, 0) / DAY_MS);
      if (mStart < gridStart || mEnd > maxIdx) continue;
      const col = Math.min(Math.max(Math.floor((mStart - 1 - gridStart) / 7), 0), numCols - 1);
      if (used.has(col)) continue;
      used.add(col);
      const x = GRID_X + col * PITCH;
      parts.push(`<text x="${x}" y="62" font-size="11" fill="#8b949e">${MONTHS[m]}</text>`);
    }
  }

  for (const row of [1, 3, 5]) {
    const y = GRID_Y + row * PITCH + 9;
    parts.push(
      `<text x="${GRID_X - 8}" y="${y}" font-size="11" fill="#8b949e" text-anchor="end">${DAYS[row]}</text>`
    );
  }

  const buckets = Array.from({ length: 5 }, () => []);
  cells.forEach((c, i) => {
    const col = Math.floor((idx[i] - gridStart) / 7);
    const row = new Date(idx[i] * DAY_MS).getUTCDay();
    buckets[c.level].push([GRID_X + col * PITCH, GRID_Y + row * PITCH]);
  });
  buckets.forEach((rects, level) => {
    if (!rects.length) return;
    parts.push(`<g fill="${COLORS[level]}">`);
    for (const [x, y] of rects) {
      parts.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"/>`);
    }
    parts.push(`</g>`);
  });

  const legendY = GRID_Y + ROWS * PITCH - GAP + 14;
  const swatchY = legendY - 9;
  parts.push(
    `<text x="${gridRight}" y="${legendY}" font-size="11" fill="#8b949e" text-anchor="end">More</text>`
  );
  const swatchRight = gridRight - 36;
  for (let level = 0; level < 5; level++) {
    const x = swatchRight - CELL - (4 - level) * PITCH;
    parts.push(
      `<rect x="${x}" y="${swatchY}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS[level]}"/>`
    );
  }
  parts.push(
    `<text x="${swatchRight - 5 * PITCH + GAP - 6}" y="${legendY}" font-size="11" fill="#8b949e" text-anchor="end">Less</text>`
  );
  parts.push(`</svg>`);

  return { svg: parts.join("\n"), numCols };
}

const data = (await fetchGraphQL()) || (await fetchHtml());
const { svg, numCols } = buildSvg(data);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(
  `wrote ${OUT}: total=${fmt(data.total)} cells=${data.cells.length} cols=${numCols}`
);

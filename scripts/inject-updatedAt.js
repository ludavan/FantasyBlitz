#!/usr/bin/env node
"use strict";

const fs = require("fs/promises");
const path = require("path");
const { execSync } = require("child_process");

const YEAR = process.argv[2] || "2025";
const DATA_DIR = path.join(__dirname, "..", "data", YEAR);

function tryGitTimestamp(absPath) {
  try {
    return execSync(`git log -1 --format=%cI -- "${absPath}"`, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function ensureRanks(list) {
  return list.map((p, i) => ({ ...p, rank: p.rank ?? i + 1 }));
}

function arrayToObject(arr) {
  const out = { Flex: [], QB: [], DEF: [], Kicker: [] };
  for (const p of arr) {
    const pos = String(p.position || "").toUpperCase();
    if (pos === "QB") out.QB.push(p);
    else if (pos === "DEF") out.DEF.push(p);
    else if (pos === "K" || pos === "KICKER") out.Kicker.push(p);
    else if (["RB","WR","TE"].includes(pos)) out.Flex.push(p);
  }
  out.Flex   = ensureRanks(out.Flex);
  out.QB     = ensureRanks(out.QB);
  out.DEF    = ensureRanks(out.DEF);
  out.Kicker = ensureRanks(out.Kicker);
  return out;
}

async function run() {
  const files = (await fs.readdir(DATA_DIR)).filter(f => /^week-\d+\.json$/i.test(f));

  for (const file of files) {
    const abs = path.join(DATA_DIR, file);
    const stat = await fs.stat(abs);
    const gitTs = tryGitTimestamp(abs);
    const ts = gitTs || stat.mtime.toISOString();

    const raw = await fs.readFile(abs, "utf8");
    let data = JSON.parse(raw);

    // Array -> Objekt
    if (Array.isArray(data)) {
      data = arrayToObject(data);
    }

    // updatedAt setzen
    data.updatedAt = ts;

    // Zurückschreiben
    await fs.writeFile(abs, JSON.stringify(data, null, 2));
    console.log(`✅ updatedAt für ${file} = ${ts}`);
  }
}

run();

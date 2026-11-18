#!/usr/bin/env node
/*
 * Builds projects.json from Pages CMS YAML-frontmatter files.
 * Uses Node's built-in modules only; no npm install is required.
 */
const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "content", "projects");
const outputFile = path.join(__dirname, "projects.json");

function unquote(value) {
  value = value.trim();
  if (value.startsWith('"')) {
    let body = value.endsWith('"') ? value.slice(1, -1) : value.slice(1);
    return body
      .replace(/\\t/g, "\t")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\n[ \t]+/g, " ")
      .trim();
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function parseFrontmatter(fileText) {
  const match = fileText.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/);
  if (!match) return null;

  const lines = match[1].split(/\r?\n/);
  const result = {};
  let currentKey = null;
  let currentValue = "";

  function saveCurrent() {
    if (currentKey) result[currentKey] = unquote(currentValue);
  }

  for (const line of lines) {
    const field = line.match(/^([A-Za-z_][\w-]*):(?:\s*(.*))?$/);
    if (field) {
      saveCurrent();
      currentKey = field[1];
      currentValue = field[2] || "";
    } else if (currentKey && /^\s+/.test(line)) {
      currentValue += "\n" + line.trim();
    }
  }
  saveCurrent();

  if (typeof result.featured === "string") {
    result.featured = result.featured.toLowerCase() === "true";
  }
  return result;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.(md|markdown|yml|yaml|txt)$/i.test(entry.name) ? [fullPath] : [];
  });
}

const projects = walk(sourceDir)
  .map(file => {
    try {
      const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
      if (!parsed) return null;
      return {
        title: parsed.title || path.basename(file, path.extname(file)),
        category: parsed.category || "",
        description: parsed.description || "",
        thumbnail: parsed.thumbnail || "",
        video: parsed.video || "",
        featured: Boolean(parsed.featured)
      };
    } catch (error) {
      console.warn("Skipping unreadable project file:", file, error.message);
      return null;
    }
  })
  .filter(Boolean);

fs.writeFileSync(outputFile, JSON.stringify(projects, null, 2) + "\n", "utf8");
console.log(`GLOWFRAME AI: generated ${projects.length} portfolio project(s).`);

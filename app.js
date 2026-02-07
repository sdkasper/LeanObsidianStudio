/* ============================================
   Lean Obsidian Studio — Application Logic
   ============================================ */

(function () {
  "use strict";

  // --- DOM refs ---
  const queryInput = document.getElementById("queryInput");
  const generateBtn = document.getElementById("generateBtn");
  const generateLabel = document.getElementById("generateLabel");
  const blueprintTitle = document.getElementById("blueprintTitle");
  const resetBtn = document.getElementById("resetBtn");
  const outputPlaceholder = document.getElementById("outputPlaceholder");
  const outputResult = document.getElementById("outputResult");
  const outputCode = document.getElementById("outputCode");
  const outputPanel = document.getElementById("outputPanel");
  const copyBtn = document.getElementById("copyBtn");
  const copyLabel = document.getElementById("copyLabel");
  const downloadBtn = document.getElementById("downloadBtn");
  const cards = document.querySelectorAll(".card[data-template]");
  const templatesSection = document.getElementById("templatesSection");

  let selectedTemplate = null;
  let hasGenerated = false;
  let inputFromCard = false; // true when textarea was populated by a card click

  // ------------------------------------------------
  // Reset to initial state
  // ------------------------------------------------
  function resetToInitial() {
    hasGenerated = false;

    // Restore input panel
    blueprintTitle.textContent = "Base Blueprint";
    resetBtn.style.display = "none";
    queryInput.value = "";
    queryInput.placeholder = "Describe the query you want.";
    generateLabel.textContent = "Generate my Base";

    // Clear selection
    selectedTemplate = null;
    inputFromCard = false;
    cards.forEach((c) => c.classList.remove("card--selected"));

    // Hide output
    outputPlaceholder.style.display = "flex";
    outputResult.style.display = "none";
    outputPanel.classList.remove("blueprint__output--filled");
    outputCode.textContent = "";

    // Show templates
    templatesSection.style.display = "";
  }

  // ------------------------------------------------
  // Template card selection
  // ------------------------------------------------
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.template;
      const tpl = TEMPLATES[key];
      if (!tpl) return;

      // Always reset to a clean slate first
      resetToInitial();

      // Then select this card and fill description
      card.classList.add("card--selected");
      selectedTemplate = key;
      inputFromCard = true;
      queryInput.value = tpl.description;
    });
  });

  // ------------------------------------------------
  // Generate Base query
  // ------------------------------------------------
  generateBtn.addEventListener("click", () => {
    const input = queryInput.value.trim();
    if (!input) return;

    let yaml = null;

    // 1. Card selected AND text unchanged → use the template directly.
    if (
      selectedTemplate &&
      TEMPLATES[selectedTemplate] &&
      input === TEMPLATES[selectedTemplate].description
    ) {
      yaml = TEMPLATES[selectedTemplate].yaml;
    } else {
      // Clear stale card selection.
      if (selectedTemplate) {
        selectedTemplate = null;
        cards.forEach((c) => c.classList.remove("card--selected"));
      }

      // 2. If the user typed from scratch (no card involved), try keyword matching.
      //    Skip keyword matching when the user edited a card's text, because keywords
      //    from the original description would match back to the same template.
      if (!inputFromCard) {
        yaml = matchByKeywords(input);
      }

      // 3. Build from the user's actual text.
      if (!yaml) {
        yaml = buildFallbackBase(input);
      }
    }

    showOutput(yaml);
    enterGeneratedState();
  });

  // ------------------------------------------------
  // Post-generate state: update UI labels
  // ------------------------------------------------
  function enterGeneratedState() {
    if (hasGenerated) return;
    hasGenerated = true;

    blueprintTitle.textContent = "Modify Your Base";
    resetBtn.style.display = "inline-flex";
    queryInput.value = "";
    queryInput.placeholder = "e.g., Change the bar color or add a summary.";
    generateLabel.textContent = "Update Base";

    // Textarea is now empty — next input is typed from scratch.
    inputFromCard = false;
  }

  // ------------------------------------------------
  // Reset button
  // ------------------------------------------------
  resetBtn.addEventListener("click", resetToInitial);

  // ------------------------------------------------
  // Keyword matcher
  // ------------------------------------------------
  function matchByKeywords(text) {
    const lower = text.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of KEYWORD_MAP) {
      let score = 0;
      for (const kw of entry.keywords) {
        if (lower.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry.template;
      }
    }

    if (bestScore === 0) return null;

    // Check card templates first, then extras.
    if (TEMPLATES[bestMatch]) return TEMPLATES[bestMatch].yaml;
    if (EXTRA_TEMPLATES[bestMatch]) return EXTRA_TEMPLATES[bestMatch];
    return null;
  }

  // ------------------------------------------------
  // Fallback: generate a base from the user's actual text
  // ------------------------------------------------
  function buildFallbackBase(text) {
    const lower = text.toLowerCase();

    // --- Filters ---
    const tagMatch = text.match(/#(\w[\w-/]*)/);
    const folderMatch = text.match(/(?:folder|in)\s+["']?(\w[\w\s/]*)["']?/i);
    const wantsMd = /\bmd\b|\bmarkdown\b/i.test(text);

    let viewType = "table";
    if (lower.includes("card")) viewType = "cards";
    else if (lower.includes("list")) viewType = "list";
    else if (lower.includes("map")) viewType = "map";

    const filters = [];
    if (tagMatch) {
      filters.push(`file.hasTag("${tagMatch[1]}")`);
    }
    if (folderMatch) {
      filters.push(`file.inFolder("${folderMatch[1].trim()}")`);
    }
    if (wantsMd || filters.length === 0) {
      filters.push('file.ext == "md"');
    }

    // --- Extract properties to display ---
    // Collect quoted strings, skip values already used as folder/tag names.
    const folderName = folderMatch ? folderMatch[1].trim().toLowerCase() : null;
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : null;

    const quotedProps = [];
    const quoteRe = /[""\u201C\u201D]([^""\u201C\u201D]+)[""\u201C\u201D]/g;
    let qm;
    while ((qm = quoteRe.exec(text)) !== null) {
      const val = qm[1].trim();
      const valLower = val.toLowerCase();
      if (valLower === folderName || valLower === tagName || valLower === "md") continue;
      quotedProps.push(val);
    }

    // Map well-known names to Bases property paths
    const PROP_MAP = {
      "file name": "file.name",
      "filename": "file.name",
      "name": "file.name",
      "file size": "file.size",
      "size": "file.size",
      "folder": "file.folder",
      "file folder": "file.folder",
      "created": "file.ctime",
      "creation date": "file.ctime",
      "modified": "file.mtime",
      "modification date": "file.mtime",
      "tags": "file.tags",
      "links": "file.links",
      "extension": "file.ext",
      "ext": "file.ext",
    };

    const orderProps = quotedProps.map(
      (p) => PROP_MAP[p.toLowerCase()] || p
    );

    // --- Sort ---
    const sortMatch = text.match(/sort(?:ed)?\s+by\s+["']?(\w[\w\s]*)["']?/i);
    let sortProp = null;
    let sortDir = "ASC";
    if (sortMatch) {
      const raw = sortMatch[1].trim();
      sortProp = PROP_MAP[raw.toLowerCase()] || raw;
      if (/\bdesc/i.test(text)) sortDir = "DESC";
    }

    // --- Group ---
    const groupMatch = text.match(/group(?:ed)?\s+by\s+["']?(\w[\w\s]*)["']?/i);
    let groupProp = null;
    if (groupMatch) {
      const raw = groupMatch[1].trim();
      groupProp = PROP_MAP[raw.toLowerCase()] || raw;
    }

    // --- Build YAML ---
    const filterYaml = filters
      .map((f) => `    - ${f.includes('"') ? "'" + f + "'" : f}`)
      .join("\n");

    let yaml = `filters:\n  and:\n${filterYaml}`;

    // If the user specified properties, use those directly.
    // Otherwise fall back to generic formulas.
    if (orderProps.length === 0) {
      yaml += `\n\nformulas:`;
      yaml += `\n  last_updated: 'file.mtime.relative()'`;
      yaml += `\n  word_count: '(file.size / 5).round(0)'`;
      yaml += `\n\nproperties:`;
      yaml += `\n  formula.last_updated:\n    displayName: "Updated"`;
      yaml += `\n  formula.word_count:\n    displayName: "~Words"`;
      orderProps.push("file.name", "formula.word_count", "formula.last_updated");
    }

    const orderYaml = orderProps.map((p) => `      - ${p}`).join("\n");

    yaml += `\n\nviews:`;
    yaml += `\n  - type: ${viewType}`;
    yaml += `\n    name: "Results"`;
    yaml += `\n    order:\n${orderYaml}`;

    if (sortProp) {
      yaml += `\n    sort:`;
      yaml += `\n      - property: ${sortProp}`;
      yaml += `\n        direction: ${sortDir}`;
    }

    if (groupProp) {
      yaml += `\n    groupBy:`;
      yaml += `\n      property: ${groupProp}`;
      yaml += `\n      direction: ASC`;
    }

    return yaml;
  }

  // ------------------------------------------------
  // Display the output
  // ------------------------------------------------
  function showOutput(yaml) {
    outputPlaceholder.style.display = "none";
    outputResult.style.display = "flex";
    outputPanel.classList.add("blueprint__output--filled");
    outputCode.textContent = yaml;
  }

  // ------------------------------------------------
  // Copy to clipboard
  // ------------------------------------------------
  copyBtn.addEventListener("click", () => {
    const text = outputCode.textContent;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      copyLabel.textContent = "Copied!";
      copyBtn.classList.add("blueprint__action-btn--success");
      setTimeout(() => {
        copyLabel.textContent = "Copy";
        copyBtn.classList.remove("blueprint__action-btn--success");
      }, 2000);
    });
  });

  // ------------------------------------------------
  // Download .base file
  // ------------------------------------------------
  downloadBtn.addEventListener("click", () => {
    const text = outputCode.textContent;
    if (!text) return;

    const blob = new Blob([text], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query.base";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ------------------------------------------------
  // Allow Enter (Ctrl/Cmd+Enter) to trigger generate
  // ------------------------------------------------
  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateBtn.click();
    }
  });
})();

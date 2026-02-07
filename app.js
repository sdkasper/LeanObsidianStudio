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

  // Map well-known names to Bases property paths (shared by build & update).
  const PROP_MAP = {
    "file name": "file.name",
    filename: "file.name",
    name: "file.name",
    "file size": "file.size",
    size: "file.size",
    folder: "file.folder",
    "file folder": "file.folder",
    created: "file.ctime",
    "creation date": "file.ctime",
    modified: "file.mtime",
    "modification date": "file.mtime",
    tags: "file.tags",
    links: "file.links",
    extension: "file.ext",
    ext: "file.ext",
  };

  /** Resolve a name to its Bases property path. */
  function resolveProp(name) {
    return PROP_MAP[name.toLowerCase()] || name;
  }

  /**
   * Extract property names from a text segment.
   * Handles quoted ("name") and bare comma/and-separated names.
   */
  function extractProps(text) {
    const props = [];
    const qRe = /["'\u201C\u201D]([^"'\u201C\u201D]+)["'\u201C\u201D]/g;
    let m;
    while ((m = qRe.exec(text)) !== null) props.push(m[1].trim());
    if (props.length > 0) return props;

    // Unquoted: split by comma / "and", filter noise words
    const NOISE =
      /^(?:a|an|the|it|to|as|my|this|that|me|too|also|well|and|or|for|of|in|on|view|type|column|columns|property|properties|field|fields|be|should|shall|must|can|could|would|please)$/i;
    text.split(/\s*(?:,\s*(?:and\s+)?|\band\b)\s*/i).forEach((part) => {
      const cleaned = part.replace(/^(?:the|a|an)\s+/i, "").trim();
      if (cleaned && cleaned.length > 1 && !NOISE.test(cleaned)) {
        props.push(cleaned);
      }
    });
    return props;
  }

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

    // --- Update mode: modify the existing query ---
    if (hasGenerated) {
      yaml = updateExistingBase(outputCode.textContent, input);
    }
    // --- First generation ---
    else if (
      selectedTemplate &&
      TEMPLATES[selectedTemplate] &&
      input === TEMPLATES[selectedTemplate].description
    ) {
      // Card selected AND text unchanged → use the template directly.
      yaml = TEMPLATES[selectedTemplate].yaml;
    } else {
      // Clear stale card selection.
      if (selectedTemplate) {
        selectedTemplate = null;
        cards.forEach((c) => c.classList.remove("card--selected"));
      }

      // If the user typed from scratch (no card involved), try keyword matching.
      // Skip keyword matching when the user edited a card's text, because keywords
      // from the original description would match back to the same template.
      if (!inputFromCard) {
        yaml = matchByKeywords(input);
      }

      // Build from the user's actual text.
      if (!yaml) {
        yaml = buildFallbackBase(input);
      }
    }

    showOutput(yaml);
    enterGeneratedState();

    // Clear textarea after update so user can type the next modification.
    queryInput.value = "";
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
    queryInput.placeholder =
      "e.g., also show status, switch to cards, change tag to #recipes";
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
    // Support both #tag and "tagged X" / "tag X"
    const tagMatch =
      text.match(/#(\w[\w-/]*)/) ||
      text.match(/\btag(?:ged)?\s+["']?(\w[\w-/]*)["']?/i);
    const folderMatch = text.match(/(?:folder|in)\s+["']?(\w[\w\s/]*)["']?/i);
    const wantsMd = /\bmd\b|\bmarkdown\b/i.test(text);

    let viewType = "table";
    if (/\bcards?\b/i.test(lower)) viewType = "cards";
    else if (/\blist\b/i.test(lower)) viewType = "list";
    else if (/\bmap\b/i.test(lower)) viewType = "map";

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
    const folderName = folderMatch ? folderMatch[1].trim().toLowerCase() : null;
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : null;
    const skipVals = new Set(
      [folderName, tagName, "md"].filter(Boolean)
    );

    // 1. Quoted properties
    const userProps = [];
    const quoteRe = /[""\u201C\u201D]([^""\u201C\u201D]+)[""\u201C\u201D]/g;
    let qm;
    while ((qm = quoteRe.exec(text)) !== null) {
      const val = qm[1].trim();
      if (!skipVals.has(val.toLowerCase())) userProps.push(val);
    }

    // 2. If no quoted properties, try unquoted after
    //    "properties/columns/fields" or "show/display/with ... properties"
    if (userProps.length === 0) {
      const propListMatch =
        text.match(
          /(?:properties|columns|fields)\s+(.+?)(?:\.\s|,?\s*(?:sort|group|filter)\b|$)/i
        ) ||
        text.match(
          /(?:show|display|with)\s+(?:(?:the|me|following|these)\s+)?(?:(?:properties|columns|fields)\s+)(.+?)(?:\.\s|,?\s*(?:sort|group|filter)\b|$)/i
        );
      if (propListMatch) {
        extractProps(propListMatch[1]).forEach((p) => {
          if (!skipVals.has(p.toLowerCase())) userProps.push(p);
        });
      }
    }

    const orderProps = userProps.map((p) => resolveProp(p));

    // --- Sort ---
    const sortMatch = text.match(
      /(?:sort|order)(?:ed)?\s+by\s+["']?(\w[\w\s]*)["']?/i
    );
    let sortProp = null;
    let sortDir = "ASC";
    if (sortMatch) {
      sortProp = resolveProp(sortMatch[1].trim());
      if (/\bdesc/i.test(text)) sortDir = "DESC";
    }

    // --- Group ---
    const groupMatch = text.match(/group(?:ed)?\s+by\s+["']?(\w[\w\s]*)["']?/i);
    let groupProp = null;
    if (groupMatch) {
      groupProp = resolveProp(groupMatch[1].trim());
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
  // Update an existing YAML base using a modification prompt
  // ------------------------------------------------
  function updateExistingBase(currentYaml, prompt) {
    let yaml = currentYaml;
    const lower = prompt.toLowerCase();

    // --- Tag filter (supports #tag and "change tag to X") ---
    const tagMatch =
      prompt.match(/#(\w[\w-/]*)/) ||
      prompt.match(/\btag(?:ged)?\s+(?:to\s+)?["']?(\w[\w-/]*)["']?/i);
    if (tagMatch) {
      const newTag = tagMatch[1];
      if (/file\.hasTag\(/.test(yaml)) {
        yaml = yaml.replace(/file\.hasTag\("[^"]*"\)/, `file.hasTag("${newTag}")`);
      } else {
        yaml = yaml.replace(
          /(filters:\n\s+and:\n)/,
          `$1    - 'file.hasTag("${newTag}")'\n`
        );
      }
    }

    // --- Folder filter ---
    const folderMatch = prompt.match(
      /(?:folder|in)\s+["']?(\w[\w\s/]*)["']?/i
    );
    if (folderMatch) {
      const newFolder = folderMatch[1].trim();
      if (/file\.inFolder\(/.test(yaml)) {
        yaml = yaml.replace(
          /file\.inFolder\("[^"]*"\)/,
          `file.inFolder("${newFolder}")`
        );
      } else {
        yaml = yaml.replace(
          /(filters:\n\s+and:\n)/,
          `$1    - 'file.inFolder("${newFolder}")'\n`
        );
      }
    }

    // --- View type (loose: any mention of cards/table/list/map) ---
    if (/\bcards?\b/i.test(lower))
      yaml = yaml.replace(/type: \w+/, "type: cards");
    else if (/\btable\b/i.test(lower))
      yaml = yaml.replace(/type: \w+/, "type: table");
    else if (/\blist\b/i.test(lower))
      yaml = yaml.replace(/type: \w+/, "type: list");
    else if (/\bmap\b/i.test(lower))
      yaml = yaml.replace(/type: \w+/, "type: map");

    // --- Add properties ("also show X", "include X and Y", "I need X") ---
    const addSeg = prompt.match(
      /(?:add|show|include|also|display|want|need)\s+(.*?)(?:\.\s*$|$)/i
    );
    if (addSeg && !/\b(?:remove|hide|delete|drop)\b/i.test(lower)) {
      const VIEW_NOISE =
        /^(?:cards?|table|list|map|view|sort|group|it|this|that|them)$/i;
      const names = extractProps(addSeg[1]);
      for (const name of names) {
        const prop = resolveProp(name);
        if (VIEW_NOISE.test(prop)) continue;
        if (yaml.includes(`- ${prop}`)) continue; // already present
        yaml = yaml.replace(
          /(order:\n(?:\s+- [^\n]+\n)*\s+- [^\n]+)/,
          `$1\n      - ${prop}`
        );
      }
    }

    // --- Remove properties ("remove X", "hide X", "drop X and Y") ---
    const removeSeg = prompt.match(
      /(?:remove|hide|delete|drop|without)\s+(.*?)(?:\.\s*$|$)/i
    );
    if (removeSeg) {
      const names = extractProps(removeSeg[1]);
      for (const name of names) {
        const prop = resolveProp(name);
        const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        yaml = yaml.replace(new RegExp(`\\n\\s+- ${escaped}`, ""), "");
      }
    }

    // --- Sort ("sort by X", "order by X descending") ---
    const sortMatch = prompt.match(
      /(?:sort|order)(?:ed)?\s+by\s+["']?(\w[\w\s]*)["']?/i
    );
    if (sortMatch) {
      const prop = resolveProp(sortMatch[1].trim());
      const dir = /\bdesc/i.test(prompt) ? "DESC" : "ASC";
      if (/\n\s+sort:/.test(yaml)) {
        yaml = yaml.replace(
          /sort:\n\s+- property: [^\n]+\n\s+direction: \w+/,
          `sort:\n      - property: ${prop}\n        direction: ${dir}`
        );
      } else {
        yaml = yaml.replace(
          /(order:\n(?:\s+- [^\n]+\n)*\s+- [^\n]+)/,
          `$1\n    sort:\n      - property: ${prop}\n        direction: ${dir}`
        );
      }
    }

    // --- Group ("group by X") ---
    const groupMatch = prompt.match(
      /group(?:ed)?\s+by\s+["']?(\w[\w\s]*)["']?/i
    );
    if (groupMatch) {
      const prop = resolveProp(groupMatch[1].trim());
      if (/\n\s+groupBy:/.test(yaml)) {
        yaml = yaml.replace(
          /groupBy:\n\s+property: [^\n]+/,
          `groupBy:\n      property: ${prop}`
        );
      } else {
        yaml = yaml.replace(
          /(order:\n(?:\s+- [^\n]+\n)*\s+- [^\n]+)/,
          `$1\n    groupBy:\n      property: ${prop}\n      direction: ASC`
        );
      }
    }

    // --- Rename view ---
    const renameMatch = prompt.match(
      /(?:rename|name|call)\s+(?:(?:the|this|it)\s+)?(?:view\s+)?(?:to\s+)?["']([^"']+)["']/i
    );
    if (renameMatch) {
      yaml = yaml.replace(/name: "[^"]*"/, `name: "${renameMatch[1].trim()}"`);
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

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

    // 1. If a card is selected, use that template directly.
    if (selectedTemplate && TEMPLATES[selectedTemplate]) {
      yaml = TEMPLATES[selectedTemplate].yaml;
    } else {
      // 2. Try keyword matching against the user's description.
      yaml = matchByKeywords(input);
    }

    // 3. Fallback: build a minimal base from the description.
    if (!yaml) {
      yaml = buildFallbackBase(input);
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
  // Fallback: generate a minimal base from keywords
  // ------------------------------------------------
  function buildFallbackBase(text) {
    const lower = text.toLowerCase();

    // Try to extract a tag name
    const tagMatch = text.match(/#(\w[\w-/]*)/);
    // Try to extract a folder name
    const folderMatch = text.match(/(?:folder|in)\s+["']?(\w[\w\s/]*)["']?/i);
    // Detect desired view type
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
    if (filters.length === 0) {
      filters.push('file.ext == "md"');
    }

    const filterYaml = filters
      .map((f) => `    - ${f.includes('"') ? "'" + f + "'" : f}`)
      .join("\n");

    return `filters:
  and:
${filterYaml}

formulas:
  last_updated: 'file.mtime.relative()'
  word_count: '(file.size / 5).round(0)'

properties:
  formula.last_updated:
    displayName: "Updated"
  formula.word_count:
    displayName: "~Words"

views:
  - type: ${viewType}
    name: "Results"
    order:
      - file.name
      - formula.word_count
      - formula.last_updated`;
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

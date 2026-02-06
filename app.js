/* ============================================
   Lean Obsidian Studio — Application Logic
   ============================================ */

(function () {
  "use strict";

  // --- Shared DOM refs ---
  var outputPlaceholder = document.getElementById("outputPlaceholder");
  var outputResult = document.getElementById("outputResult");
  var outputCode = document.getElementById("outputCode");
  var outputPanel = document.getElementById("outputPanel");
  var copyBtn = document.getElementById("copyBtn");
  var copyLabel = document.getElementById("copyLabel");
  var downloadBtn = document.getElementById("downloadBtn");

  // --- Chat-mode DOM refs ---
  var chatPanel = document.getElementById("chatPanel");
  var queryInput = document.getElementById("queryInput");
  var generateBtn = document.getElementById("generateBtn");
  var generateLabel = document.getElementById("generateLabel");
  var blueprintTitle = document.getElementById("blueprintTitle");
  var resetBtn = document.getElementById("resetBtn");
  var cards = document.querySelectorAll(".card[data-template]");
  var templatesSection = document.getElementById("templatesSection");

  // --- Configurator DOM refs ---
  var configuratorPanel = document.getElementById("configuratorPanel");
  var cfgGenerateBtn = document.getElementById("cfgGenerateBtn");
  var cfgGenerateLabel = document.getElementById("cfgGenerateLabel");
  var cfgFinetune = document.getElementById("cfgFinetune");
  var cfgChatInput = document.getElementById("cfgChatInput");
  var cfgChatBtn = document.getElementById("cfgChatBtn");
  var cfgResetBtn = document.getElementById("cfgResetBtn");

  // --- Mode toggle ---
  var modeButtons = document.querySelectorAll(".mode-toggle__btn");
  var currentMode = "chat";

  var selectedTemplate = null;
  var chatHasGenerated = false;
  var cfgHasGenerated = false;

  // ================================================
  // MODE SWITCHING
  // ================================================
  modeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.dataset.mode;
      if (mode === currentMode) return;

      modeButtons.forEach(function (b) { b.classList.remove("mode-toggle__btn--active"); });
      btn.classList.add("mode-toggle__btn--active");
      currentMode = mode;

      if (mode === "chat") {
        chatPanel.style.display = "flex";
        templatesSection.style.display = "";
        configuratorPanel.style.display = "none";
      } else {
        chatPanel.style.display = "none";
        templatesSection.style.display = "none";
        configuratorPanel.style.display = "flex";
      }
    });
  });

  // ================================================
  // SHARED OUTPUT
  // ================================================
  function showOutput(yaml) {
    outputPlaceholder.style.display = "none";
    outputResult.style.display = "flex";
    outputPanel.classList.add("blueprint__output--filled");
    outputCode.textContent = yaml;
  }

  function clearOutput() {
    outputPlaceholder.style.display = "flex";
    outputResult.style.display = "none";
    outputPanel.classList.remove("blueprint__output--filled");
    outputCode.textContent = "";
  }

  // ================================================
  // CHAT MODE
  // ================================================

  // --- Reset chat to initial state ---
  function resetChatToInitial() {
    chatHasGenerated = false;
    blueprintTitle.textContent = "Base Blueprint";
    resetBtn.style.display = "none";
    queryInput.value = "";
    queryInput.placeholder = "Describe the query you want.";
    generateLabel.textContent = "Generate my Base";
    selectedTemplate = null;
    cards.forEach(function (c) { c.classList.remove("card--selected"); });
    templatesSection.style.display = "";
    clearOutput();
  }

  // --- Template card selection ---
  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      var key = card.dataset.template;
      var tpl = TEMPLATES[key];
      if (!tpl) return;

      resetChatToInitial();
      card.classList.add("card--selected");
      selectedTemplate = key;
      queryInput.value = tpl.description;
    });
  });

  // --- Generate (chat) ---
  generateBtn.addEventListener("click", function () {
    var input = queryInput.value.trim();
    if (!input) return;

    var yaml = null;

    if (selectedTemplate && TEMPLATES[selectedTemplate]) {
      yaml = TEMPLATES[selectedTemplate].yaml;
    } else {
      yaml = matchByKeywords(input);
    }

    if (!yaml) {
      yaml = buildFallbackBase(input);
    }

    showOutput(yaml);
    enterChatGeneratedState();
  });

  function enterChatGeneratedState() {
    if (chatHasGenerated) return;
    chatHasGenerated = true;
    blueprintTitle.textContent = "Modify Your Base";
    resetBtn.style.display = "inline-flex";
    queryInput.value = "";
    queryInput.placeholder = "e.g., Change the bar color or add a summary.";
    generateLabel.textContent = "Update Base";
  }

  // --- Reset button (chat) ---
  resetBtn.addEventListener("click", resetChatToInitial);

  // --- Keyword matcher ---
  function matchByKeywords(text) {
    var lower = text.toLowerCase();
    var bestMatch = null;
    var bestScore = 0;

    for (var i = 0; i < KEYWORD_MAP.length; i++) {
      var entry = KEYWORD_MAP[i];
      var score = 0;
      for (var j = 0; j < entry.keywords.length; j++) {
        if (lower.indexOf(entry.keywords[j]) !== -1) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry.template;
      }
    }

    if (bestScore === 0) return null;
    if (TEMPLATES[bestMatch]) return TEMPLATES[bestMatch].yaml;
    if (EXTRA_TEMPLATES[bestMatch]) return EXTRA_TEMPLATES[bestMatch];
    return null;
  }

  // --- Fallback generator ---
  function buildFallbackBase(text) {
    var lower = text.toLowerCase();
    var tagMatch = text.match(/#(\w[\w-/]*)/);
    var folderMatch = text.match(/(?:folder|in)\s+["']?(\w[\w\s/]*)["']?/i);

    var viewType = "table";
    if (lower.indexOf("card") !== -1) viewType = "cards";
    else if (lower.indexOf("list") !== -1) viewType = "list";
    else if (lower.indexOf("map") !== -1) viewType = "map";

    var filters = [];
    if (tagMatch) filters.push('file.hasTag("' + tagMatch[1] + '")');
    if (folderMatch) filters.push('file.inFolder("' + folderMatch[1].trim() + '")');
    if (filters.length === 0) filters.push('file.ext == "md"');

    var filterYaml = filters
      .map(function (f) { return "    - " + (f.indexOf('"') !== -1 ? "'" + f + "'" : f); })
      .join("\n");

    return "filters:\n  and:\n" + filterYaml +
      "\n\nformulas:\n  last_updated: 'file.mtime.relative()'\n  word_count: '(file.size / 5).round(0)'" +
      "\n\nproperties:\n  formula.last_updated:\n    displayName: \"Updated\"\n  formula.word_count:\n    displayName: \"~Words\"" +
      "\n\nviews:\n  - type: " + viewType + "\n    name: \"Results\"\n    order:\n      - file.name\n      - formula.word_count\n      - formula.last_updated";
  }

  // --- Ctrl+Enter for chat ---
  queryInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateBtn.click();
    }
  });

  // ================================================
  // CONFIGURATOR MODE
  // ================================================

  // --- Generate (configurator) ---
  cfgGenerateBtn.addEventListener("click", function () {
    var yaml = Configurator.buildYaml();
    if (!yaml.trim()) return;

    showOutput(yaml);
    enterCfgGeneratedState();
  });

  function enterCfgGeneratedState() {
    cfgHasGenerated = true;
    cfgGenerateLabel.textContent = "Update Base";
    cfgFinetune.style.display = "block";
  }

  // --- Fine-tune chat (configurator) ---
  cfgChatBtn.addEventListener("click", function () {
    var input = cfgChatInput.value.trim();
    if (!input) return;

    // Re-generate from form (user may have tweaked fields) and show
    var yaml = Configurator.buildYaml();
    showOutput(yaml);
    cfgChatInput.value = "";
  });

  cfgChatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      cfgChatBtn.click();
    }
  });

  // --- Reset (configurator) ---
  cfgResetBtn.addEventListener("click", function () {
    cfgHasGenerated = false;
    cfgGenerateLabel.textContent = "Generate my Base";
    cfgFinetune.style.display = "none";
    cfgChatInput.value = "";
    Configurator.resetForm();
    clearOutput();
  });

  // ================================================
  // SHARED: Copy & Download
  // ================================================

  copyBtn.addEventListener("click", function () {
    var text = outputCode.textContent;
    if (!text) return;

    navigator.clipboard.writeText(text).then(function () {
      copyLabel.textContent = "Copied!";
      copyBtn.classList.add("blueprint__action-btn--success");
      setTimeout(function () {
        copyLabel.textContent = "Copy";
        copyBtn.classList.remove("blueprint__action-btn--success");
      }, 2000);
    });
  });

  downloadBtn.addEventListener("click", function () {
    var text = outputCode.textContent;
    if (!text) return;

    var blob = new Blob([text], { type: "text/yaml" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "query.base";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

})();

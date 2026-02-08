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
  let isLoading = false;

  // ------------------------------------------------
  // Reset to initial state
  // ------------------------------------------------
  function resetToInitial() {
    hasGenerated = false;

    blueprintTitle.textContent = "Base Blueprint";
    resetBtn.style.display = "none";
    queryInput.value = "";
    queryInput.placeholder = "Describe the query you want.";
    generateLabel.textContent = "Generate my Base";

    selectedTemplate = null;
    cards.forEach((c) => c.classList.remove("card--selected"));

    outputPlaceholder.style.display = "flex";
    outputResult.style.display = "none";
    outputPanel.classList.remove("blueprint__output--filled");
    outputCode.textContent = "";

    templatesSection.style.display = "";
  }

  // ------------------------------------------------
  // Loading state
  // ------------------------------------------------
  function setLoading(on) {
    isLoading = on;
    generateBtn.disabled = on;
    generateBtn.classList.toggle("blueprint__btn--loading", on);

    if (on) {
      generateLabel.dataset.prevText = generateLabel.textContent;
      generateLabel.textContent = hasGenerated ? "Updating..." : "Generating...";
    } else {
      generateLabel.textContent =
        generateLabel.dataset.prevText || "Generate my Base";
    }
  }

  // ------------------------------------------------
  // Call Claude API via Vercel proxy
  // ------------------------------------------------
  async function generateWithAI(prompt, currentYaml) {
    const body = { prompt };
    if (currentYaml) body.currentYaml = currentYaml;

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate. Please try again.");
    }

    const data = await res.json();
    return data.yaml;
  }

  // ------------------------------------------------
  // Template card selection
  // ------------------------------------------------
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.template;
      const tpl = TEMPLATES[key];
      if (!tpl) return;

      resetToInitial();
      card.classList.add("card--selected");
      selectedTemplate = key;
      queryInput.value = tpl.description;
    });
  });

  // ------------------------------------------------
  // Generate Base query
  // ------------------------------------------------
  generateBtn.addEventListener("click", async () => {
    if (isLoading) return;
    const input = queryInput.value.trim();
    if (!input) return;

    // --- Instant path: card selected, text unmodified → use static template ---
    if (
      !hasGenerated &&
      selectedTemplate &&
      TEMPLATES[selectedTemplate] &&
      input === TEMPLATES[selectedTemplate].description
    ) {
      showOutput(TEMPLATES[selectedTemplate].yaml);
      enterGeneratedState();
      queryInput.value = "";
      return;
    }

    // --- AI path: everything else ---
    // Clear stale card selection
    if (selectedTemplate) {
      selectedTemplate = null;
      cards.forEach((c) => c.classList.remove("card--selected"));
    }

    setLoading(true);
    queryInput.value = "";

    try {
      const currentYaml = hasGenerated ? outputCode.textContent : null;
      const yaml = await generateWithAI(input, currentYaml);
      showOutput(yaml);
      enterGeneratedState();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
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

    templatesSection.style.display = "";
  }

  // ------------------------------------------------
  // Reset button
  // ------------------------------------------------
  resetBtn.addEventListener("click", resetToInitial);

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
  // Display an error
  // ------------------------------------------------
  function showError(message) {
    outputPlaceholder.style.display = "none";
    outputResult.style.display = "flex";
    outputPanel.classList.add("blueprint__output--filled");
    outputCode.textContent = "Error: " + message;
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

/* ============================================
   Configurator — YAML builder & dynamic rows
   ============================================ */

var Configurator = (function () {
  "use strict";

  // --- DOM refs ---
  var formulaContainer = document.getElementById("cfgFormulaRows");
  var summaryContainer = document.getElementById("cfgSummaryRows");

  // ------------------------------------------------
  // Dynamic formula rows
  // ------------------------------------------------
  function addFormulaRow() {
    var row = document.createElement("div");
    row.className = "config__dyn-row";
    row.innerHTML =
      '<input type="text" class="config__input config__input--sm" placeholder="name" data-role="formula-name">' +
      '<input type="text" class="config__input config__input--grow" placeholder="expression" data-role="formula-expr">' +
      '<button type="button" class="config__remove-btn" title="Remove">&times;</button>';
    row.querySelector(".config__remove-btn").addEventListener("click", function () {
      row.remove();
    });
    formulaContainer.appendChild(row);
  }

  // ------------------------------------------------
  // Dynamic summary rows
  // ------------------------------------------------
  function addSummaryRow() {
    var row = document.createElement("div");
    row.className = "config__dyn-row";
    row.innerHTML =
      '<input type="text" class="config__input config__input--sm" placeholder="property" data-role="summary-prop">' +
      '<select class="config__select config__select--grow" data-role="summary-type">' +
        '<option value="Sum">Sum</option>' +
        '<option value="Average">Average</option>' +
        '<option value="Min">Min</option>' +
        '<option value="Max">Max</option>' +
        '<option value="Median">Median</option>' +
        '<option value="Range">Range</option>' +
        '<option value="Stddev">Stddev</option>' +
        '<option value="Earliest">Earliest</option>' +
        '<option value="Latest">Latest</option>' +
        '<option value="Filled">Filled</option>' +
        '<option value="Empty">Empty</option>' +
        '<option value="Unique">Unique</option>' +
        '<option value="Checked">Checked</option>' +
        '<option value="Unchecked">Unchecked</option>' +
      '</select>' +
      '<button type="button" class="config__remove-btn" title="Remove">&times;</button>';
    row.querySelector(".config__remove-btn").addEventListener("click", function () {
      row.remove();
    });
    summaryContainer.appendChild(row);
  }

  // ------------------------------------------------
  // Read helpers
  // ------------------------------------------------
  function val(id) {
    return document.getElementById(id).value;
  }

  function getCheckedProps() {
    var checks = document.querySelectorAll("#cfgFileProps input[type=checkbox]:checked");
    var result = [];
    checks.forEach(function (cb) { result.push(cb.value); });
    return result;
  }

  function getFormulas() {
    var rows = formulaContainer.querySelectorAll(".config__dyn-row");
    var result = [];
    rows.forEach(function (r) {
      var name = r.querySelector('[data-role="formula-name"]').value.trim();
      var expr = r.querySelector('[data-role="formula-expr"]').value.trim();
      if (name && expr) result.push({ name: name, expr: expr });
    });
    return result;
  }

  function getSummaries() {
    var rows = summaryContainer.querySelectorAll(".config__dyn-row");
    var result = [];
    rows.forEach(function (r) {
      var prop = r.querySelector('[data-role="summary-prop"]').value.trim();
      var type = r.querySelector('[data-role="summary-type"]').value;
      if (prop && type) result.push({ prop: prop, type: type });
    });
    return result;
  }

  // ------------------------------------------------
  // YAML builder
  // ------------------------------------------------
  function buildYaml() {
    var lines = [];

    // --- Filters ---
    var tags = val("cfgTags").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    var folder = val("cfgFolder").trim();
    var logic = val("cfgFilterLogic");

    var filters = [];
    tags.forEach(function (tag) {
      filters.push('file.hasTag("' + tag + '")');
    });
    if (folder) {
      filters.push('file.inFolder("' + folder + '")');
    }

    if (filters.length > 0) {
      lines.push("filters:");
      lines.push("  " + logic + ":");
      filters.forEach(function (f) {
        if (f.indexOf('"') !== -1) {
          lines.push("    - '" + f + "'");
        } else {
          lines.push("    - " + f);
        }
      });
      lines.push("");
    }

    // --- Formulas ---
    var formulas = getFormulas();
    if (formulas.length > 0) {
      lines.push("formulas:");
      formulas.forEach(function (f) {
        if (f.expr.indexOf('"') !== -1) {
          lines.push("  " + f.name + ": '" + f.expr + "'");
        } else {
          lines.push('  ' + f.name + ': "' + f.expr + '"');
        }
      });
      lines.push("");
    }

    // --- Properties display names for formulas ---
    if (formulas.length > 0) {
      lines.push("properties:");
      formulas.forEach(function (f) {
        var display = f.name.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        lines.push("  formula." + f.name + ":");
        lines.push('    displayName: "' + display + '"');
      });
      lines.push("");
    }

    // --- Views ---
    var viewType = val("cfgViewType");
    var viewName = val("cfgViewName").trim() || "Results";
    var limit = val("cfgLimit").trim();
    var sortBy = val("cfgSortBy").trim();
    var sortDir = val("cfgSortDir");
    var groupBy = val("cfgGroupBy").trim();
    var groupDir = val("cfgGroupDir");

    // Collect ordered properties
    var order = getCheckedProps();
    var custom = val("cfgCustomProps").split(",").map(function (p) { return p.trim(); }).filter(Boolean);
    order = order.concat(custom);
    // Append formula properties
    formulas.forEach(function (f) { order.push("formula." + f.name); });

    lines.push("views:");
    lines.push("  - type: " + viewType);
    lines.push('    name: "' + viewName + '"');
    if (limit) lines.push("    limit: " + limit);

    if (order.length > 0) {
      lines.push("    order:");
      order.forEach(function (p) { lines.push("      - " + p); });
    }

    if (sortBy && sortDir) {
      lines.push("    sort:");
      lines.push("      - property: " + sortBy);
      lines.push("        direction: " + sortDir);
    }

    if (groupBy && groupDir) {
      lines.push("    groupBy:");
      lines.push("      property: " + groupBy);
      lines.push("      direction: " + groupDir);
    }

    // --- Summaries ---
    var summaries = getSummaries();
    if (summaries.length > 0) {
      lines.push("    summaries:");
      summaries.forEach(function (s) {
        lines.push("      " + s.prop + ": " + s.type);
      });
    }

    return lines.join("\n");
  }

  // ------------------------------------------------
  // Reset form
  // ------------------------------------------------
  function resetForm() {
    document.getElementById("cfgTags").value = "";
    document.getElementById("cfgFolder").value = "";
    document.getElementById("cfgFilterLogic").value = "and";
    document.getElementById("cfgViewType").value = "table";
    document.getElementById("cfgViewName").value = "";
    document.getElementById("cfgLimit").value = "";
    document.getElementById("cfgCustomProps").value = "";
    document.getElementById("cfgSortBy").value = "";
    document.getElementById("cfgSortDir").value = "";
    document.getElementById("cfgGroupBy").value = "";
    document.getElementById("cfgGroupDir").value = "";

    // Reset checkboxes: only file.name checked
    var checks = document.querySelectorAll("#cfgFileProps input[type=checkbox]");
    checks.forEach(function (cb) { cb.checked = cb.value === "file.name"; });

    // Clear dynamic rows
    formulaContainer.innerHTML = "";
    summaryContainer.innerHTML = "";
  }

  // ------------------------------------------------
  // Wire up add buttons
  // ------------------------------------------------
  document.getElementById("cfgAddFormula").addEventListener("click", addFormulaRow);
  document.getElementById("cfgAddSummary").addEventListener("click", addSummaryRow);

  // Public API
  return {
    buildYaml: buildYaml,
    resetForm: resetForm,
    addFormulaRow: addFormulaRow,
    addSummaryRow: addSummaryRow
  };
})();

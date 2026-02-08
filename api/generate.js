const fs = require("fs");
const path = require("path");

// Load the Obsidian Bases skill reference at cold-start
let skillRef = "";
try {
  const raw = fs.readFileSync(
    path.join(process.cwd(), ".agents", "skills", "obsidian-bases", "SKILL.md"),
    "utf-8"
  );
  // Strip YAML frontmatter
  skillRef = raw.replace(/^---[\s\S]*?---\n*/, "");
} catch (_) {
  /* function still works, just without the full reference */
}

const SYSTEM_PROMPT = `You are an expert Obsidian Bases (.base file) generator. You create valid YAML for Obsidian's Bases core plugin.

${skillRef}

## Your Output Rules
- Output ONLY raw YAML. No markdown code fences, no explanations, no preamble, no commentary.
- The output must be valid YAML that can be saved directly as a .base file.
- Use proper YAML quoting: single quotes for formulas containing double quotes.
- When updating an existing base, return the COMPLETE modified YAML (not just a diff).
- Be creative with formulas when appropriate — use icons, conditional formatting, relative dates, computed fields.
- Always include meaningful property displayNames.
- If the user's request is unclear, make reasonable assumptions and build the best base you can.`;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "API key not configured. Add ANTHROPIC_API_KEY in Vercel environment variables.",
    });
  }

  const { prompt, currentYaml } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  // Build the user message
  let userMessage = prompt;
  if (currentYaml) {
    userMessage =
      "Here is the current Obsidian Base YAML:\n```yaml\n" +
      currentYaml +
      "\n```\n\nPlease modify it according to this request: " +
      prompt;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", response.status, errBody);
      return res
        .status(502)
        .json({ error: "AI service error. Please try again." });
    }

    const data = await response.json();
    let yaml = (data.content && data.content[0] && data.content[0].text) || "";

    // Strip markdown fences if the model wraps them
    yaml = yaml
      .replace(/^```(?:yaml|yml)?\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    return res.status(200).json({ yaml });
  } catch (err) {
    console.error("Generate error:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate. Please try again." });
  }
};

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BasesBuilder is an agent skills repository for creating Obsidian Bases files via a chat interface. This is not a traditional code project—there are no build scripts, package managers, or test runners. The repository contains skill definitions that Claude Code instances use to understand specialized domains.

## Architecture

The repository uses an agent-skills pattern with skill definitions in `.agents/skills/`:

```
.agents/skills/
├── obsidian-bases/SKILL.md      # Obsidian Bases (.base files) syntax
├── obsidian-markdown/SKILL.md   # Obsidian Flavored Markdown syntax
└── frontend-design/SKILL.md     # Production-grade UI design guidelines
```

Reference files live in `.references/`:
- `BASES DEMO.md` - Comprehensive demonstration of Bases syntax with real-world examples

## Skills

### obsidian-bases
Creates Obsidian Bases (.base files) - YAML-based dynamic views of notes. Includes:
- Filter syntax (AND/OR/NOT logic)
- Formula definitions with type-specific functions
- View types: table, cards, list, map
- Summary formulas for aggregations

Key concepts:
- Three property types: note properties, file properties (`file.name`, `file.mtime`), formula properties (`formula.my_formula`)
- Duration type from date subtraction (access `.days`, `.hours` before calling `.round()`)
- Global filters apply to all views; view-specific filters narrow further

### obsidian-markdown
Obsidian Flavored Markdown including wikilinks (`[[Note]]`), embeds (`![[Note]]`), callouts, properties/frontmatter, LaTeX math, Mermaid diagrams, and task lists.

### frontend-design
Guidelines for distinctive, production-grade UI design. Emphasizes:
- Bold aesthetic direction (brutalist, maximalist, retro-futuristic, etc.)
- Typography with distinctive fonts (avoid Inter, Roboto, Arial)
- Cohesive color palettes with dominant colors and sharp accents
- Motion and spatial composition that surprises

## Working with This Repository

- **Skill definitions** are Markdown files with YAML frontmatter (`name`, `description`)
- **Extending skills**: Add examples, patterns, or functions to existing SKILL.md files
- **Testing**: Manual testing in Obsidian with `.base` files or markdown notes
- **References**: Use `BASES DEMO.md` as a template for complex Bases configurations

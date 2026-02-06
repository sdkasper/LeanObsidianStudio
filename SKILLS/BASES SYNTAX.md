- Produce a complete `.base` YAML configuration that matches the requested views, filters, formulas, and summaries.
- Output must be directly usable by the Bases plugin.

# Output rules (strict)
- Output ONLY the YAML content of the `.base` file. No explanations, no markdown fences, no extra text.
- Use 2-space indentation.
- Use a predictable key order:
  1) summaries
  2) filters
  3) formulas
  4) views
- Only include sections that are actually used. Do not invent unused formulas or views.

# Reference conventions to follow
1) Top-level sections
- summaries:
    <SummaryName>: <expression using values...>
- filters:
    and/or:
      - <condition>
- formulas:
    <formulaName>: <expression>
- views:
    - type: table|cards|map
      name: <string>
      filters: (optional)
      order: (optional)
      sort: (optional)
      summaries: (optional)
      columnSize: (optional)
      (plus view-type specific keys)

2) Expressions and identifiers
- Use these namespaces exactly:
  - file.<...> for file metadata (examples: file.name, file.ext, file.path, file.folder, file.tags, file.embeds, file.ctime, file.link)
  - note.<propertyName> for frontmatter properties (examples: note.featureImage, note.location, note.icon, note.color, note.created)
  - formula.<...> for formulas defined in formulas:
  - this.<...> for the current note context (examples: this.file.folder, this.file.name, this.file.hasLink(file), this.created)
- Never reference formula.<x> unless <x> is defined under formulas:.

3) Filters (YAML + quoting rules)
- filters are expressed as YAML lists under and: or or:
  filters:
    and:
      - <condition1>
      - <condition2>
- Conditions are expressions, for example:
  - file.ext == "md"
  - file.tags.contains("Recipe")
  - file.path.startsWith("01 Projects/Travel")
  - file.inFolder(this.file.folder)
  - this.file.hasLink(file)
- If a condition starts with "!" (negation) you MUST wrap it in quotes, for example:
  - "!birthday.isEmpty()"
- If a condition contains characters that might be parsed by YAML (for example ":", "#", leading "!"), wrap it in quotes.

4) Multi-line formulas
- Use YAML block scalars for long formulas:
  - Use `|` when preserving line breaks is acceptable.
  - Use `|-` when you do not want a trailing newline.
- Example pattern:
  fRemainingDays: |-
    ((number(
      ...
    ) - number(today())) / 86400000).round()

5) View definitions
A) Table view
- Minimal:
  - type: table
    name: <name>
    order:
      - <property1>
      - <property2>
- Optional:
  - filters:
      and:
        - ...
  - sort:
      - property: <property>
        direction: ASC|DESC
  - summaries:
      <propertyNameInOrder>: <SummaryNameFromTopLevelSummaries>
  - columnSize:
      <property>: <number>
    If no column sizing is needed, use `columnSize: {}`

B) Cards view
- Typical keys:
  - type: cards
    name: <name>
    filters: ...
    order: ...
    image: <property>
    imageAspectRatio: <number>
    imageProperty: <property> (if needed)
    showPropertyTitles: true|false
- image can be a note property (note.featureImage) or a formula (formula.fFirstImage).

C) Map view
- Required/typical keys:
  - type: map
    name: <name>
    filters: ...
    center: "[lat, lon]"  (string as in reference)
    defaultZoom: <number>
    maxZoom: <number>
    coordinates: note.location
    markerIcon: note.icon
    markerColor: note.color
    mapTiles:
      - <tile-url>

6) Sorting rules
- sort is a YAML list. Each item must have property and direction.
- direction must be exactly ASC or DESC.

7) File embeds and images
- Access first embed via file.embeds[0].
- If you use file.embeds[0], guard it using an if(...) and file type checks as in the reference:
  fFirstImage: if(file.embeds[0].containsAny("jpg","gif","webp","jpeg","avif","png"), file.embeds[0])

8) Validation checklist before final output
- YAML parses (consistent indentation, lists, maps).
- Every formula referenced exists.
- Every summary referenced exists.
- Filters that start with "!" are quoted.
- All strings use double-quotes.
- Views contain only keys supported by the referenced patterns (table, cards, map).
- No placeholder properties that are not requested.

- Produce a single `.base` YAML file implementing my request, following the exact conventions above, with no extra text.

# Date arithmetic
Dates can be modified by adding and subtracting durations. Duration units accept multiple formats:

Unit	Duration
y, year, years	year
M, month, months	month
d, day, days	day
w, week, weeks	week
h, hour, hours	hour
m, minute, minutes	minute
s, second, seconds	second
To modify or offset Date objects, use the + or - operator with a duration string. For example, date + "1M" adds 1 month to the date, while date - "2h" subtracts 2 hours from the date.

The global function today() can be used to get the current date, and now() can be used to get the current date with time.

now() + "1 day" returns a datetime exactly 24 hours from the time of execution.
file.mtime > now() - "1 week" returns true if the file was modified within the last week.
date("2024-12-01") + "1M" + "4h" + "3m" returns a Date object representing 2025-01-01 04:03:00.
Subtract two dates to get the millisecond difference between the two, for example, now() - file.ctime.
To get the date portion of a Date with time, use datetime.date().
To format a Date object, use the format() function, for example datetime.format("YYYY-MM-DD").
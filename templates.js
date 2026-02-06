/**
 * Pre-built Obsidian Bases templates.
 * Each template maps to one of the idea cards in the UI.
 */
const TEMPLATES = {
  progress: {
    label: "Project Progress Bar",
    description:
      "Show all notes tagged #project with a visual progress bar based on a 'progress' property (0–100).",
    yaml: `filters:
  and:
    - file.hasTag("project")
    - 'file.ext == "md"'

formulas:
  percent: "(progress / 100 * 100).round(1)"
  bar: |
    if(progress,
      "\\u2590".repeat((progress / 10).round(0)) +
      "\\u2591".repeat(10 - (progress / 10).round(0)),
      "\\u2591".repeat(10)
    )
  status_label: |
    if(progress >= 100, "Done",
      if(progress >= 50, "In Progress",
        if(progress > 0, "Started", "Not Started")))

properties:
  formula.percent:
    displayName: "Completion %"
  formula.bar:
    displayName: "Progress"
  formula.status_label:
    displayName: "Status"

views:
  - type: table
    name: "Project Tracker"
    order:
      - file.name
      - formula.status_label
      - formula.percent
      - formula.bar
    groupBy:
      property: formula.status_label
      direction: ASC
    summaries:
      progress: Average`,
  },

  ratings: {
    label: "Star Ratings Table",
    description:
      "Display notes tagged #review with a visual 5-star rating derived from a 'rating' property (1–10).",
    yaml: `filters:
  and:
    - file.hasTag("review")

formulas:
  stars: |
    if(rating.isEmpty() || rating < 1 || rating > 10,
      "11111".split("").map(icon("star-off")),
      "11111".split("").slice(0, number(rating / 2).floor()).map(icon("star"))
      + if(number(rating / 2) - number(rating / 2).floor() >= 0.5,
          [icon("star-half")], [])
    )
  score_label: 'if(rating, rating.toFixed(1) + " / 10", "—")'

properties:
  formula.stars:
    displayName: "Rating"
  formula.score_label:
    displayName: "Score"

views:
  - type: table
    name: "Reviews"
    order:
      - file.name
      - category
      - formula.stars
      - formula.score_label
    summaries:
      rating: Average`,
  },

  map: {
    label: "Travel Trip Map",
    description:
      "Plot notes tagged #travel that live in a Travel folder on an interactive map using location coordinates.",
    yaml: `filters:
  and:
    - file.hasTag("travel")
    - file.inFolder("Travel")

formulas:
  trip_year: 'if(date, date(date).format("YYYY"), "")'
  days_ago: 'if(date, (today() - date(date)).days.round(0).toString() + " days ago", "")'

properties:
  formula.trip_year:
    displayName: "Year"
  formula.days_ago:
    displayName: "When"

views:
  - type: map
    name: "Trip Map"
    coordinates: note.location
    markerIcon: note.icon
    markerColor: note.color
    defaultZoom: 4
    maxZoom: 18

  - type: table
    name: "Trip List"
    order:
      - file.name
      - location
      - formula.trip_year
      - formula.days_ago`,
  },

  birthday: {
    label: "Birthday Tracker",
    description:
      "Track birthdays of notes tagged #person and compute remaining days and current age.",
    yaml: `filters:
  and:
    - file.hasTag("person")
    - "!birthday.isEmpty()"

formulas:
  remaining_days: |-
    ((number(
      date(today().format("YYYY") + "-" + birthday.format("MM-DD")) +
      if(date(today().format("YYYY") + "-" + birthday.format("MM-DD")) < today(), "1y", "0y")
    ) - number(today())) / 86400000).round()
  age: |-
    if(birthday.format("MM-DD") <= today().format("MM-DD"),
      today() - birthday,
      today() - (birthday + duration("1 year")))
  upcoming: |
    if(formula.remaining_days <= 7, "This week!",
      if(formula.remaining_days <= 30, "This month", ""))

properties:
  formula.remaining_days:
    displayName: "Days Until"
  formula.age:
    displayName: "Age"
  formula.upcoming:
    displayName: "Soon?"

views:
  - type: table
    name: "Birthdays"
    order:
      - file.name
      - birthday
      - formula.age
      - formula.remaining_days
      - formula.upcoming
    sort:
      - property: formula.remaining_days
        direction: ASC`,
  },

  cleaner: {
    label: "Vault Cleaner",
    description:
      "Find orphan notes with no tags, no outgoing links, and small file size — candidates for cleanup.",
    yaml: `filters:
  and:
    - 'file.ext == "md"'
    - file.tags.isEmpty()
    - file.links.isEmpty()

formulas:
  word_estimate: '(file.size / 5).round(0)'
  age_days: '(now() - file.ctime).days.round(0)'
  last_touched: 'file.mtime.relative()'

properties:
  formula.word_estimate:
    displayName: "~Words"
  formula.age_days:
    displayName: "Age (days)"
  formula.last_touched:
    displayName: "Last Modified"

views:
  - type: table
    name: "Orphan Notes"
    order:
      - file.name
      - file.folder
      - formula.word_estimate
      - formula.age_days
      - formula.last_touched
    summaries:
      formula.word_estimate: Sum

  - type: table
    name: "Tiny Notes"
    filters:
      and:
        - 'file.size < 500'
    order:
      - file.name
      - file.size
      - formula.last_touched`,
  },

  summary: {
    label: "Content Summary",
    description:
      "Aggregate notes in a folder with custom summary formulas — averages, counts, and totals.",
    yaml: `filters:
  and:
    - file.inFolder("Projects")
    - 'file.ext == "md"'

formulas:
  last_updated: 'file.mtime.relative()'
  link_count: 'file.links.length'
  tag_count: 'file.tags.length'

summaries:
  avg_links: 'values.filter(value.isType("number")).mean().round(1)'

properties:
  formula.last_updated:
    displayName: "Updated"
  formula.link_count:
    displayName: "Links"
  formula.tag_count:
    displayName: "Tags"

views:
  - type: table
    name: "Content Overview"
    order:
      - file.name
      - status
      - formula.link_count
      - formula.tag_count
      - formula.last_updated
    summaries:
      formula.link_count: avg_links
      formula.tag_count: Sum
    groupBy:
      property: status
      direction: ASC

  - type: list
    name: "Quick List"
    order:
      - file.name
      - status`,
  },
};

/**
 * Keyword-driven patterns used by the generator when no template card
 * is selected. Maps arrays of trigger keywords to template keys.
 */
const KEYWORD_MAP = [
  { keywords: ["progress", "bar", "percent", "completion", "track progress"], template: "progress" },
  { keywords: ["star", "rating", "review", "score", "rate"], template: "ratings" },
  { keywords: ["map", "travel", "trip", "location", "geo", "coordinate"], template: "map" },
  { keywords: ["birthday", "age", "person", "anniversary", "born"], template: "birthday" },
  { keywords: ["clean", "orphan", "untagged", "unused", "empty", "messy", "vault cleaner"], template: "cleaner" },
  { keywords: ["summary", "aggregate", "count", "total", "overview", "content"], template: "summary" },
  { keywords: ["task", "todo", "due", "overdue", "priority"], template: "task" },
  { keywords: ["book", "reading", "library", "article", "read"], template: "reading" },
  { keywords: ["daily", "journal", "diary", "day"], template: "daily" },
];

/**
 * Extra generated templates for keyword matches that don't correspond
 * to one of the six card templates.
 */
const EXTRA_TEMPLATES = {
  task: `filters:
  and:
    - file.hasTag("task")
    - 'file.ext == "md"'

formulas:
  days_until_due: 'if(due, (date(due) - today()).days, "")'
  is_overdue: 'if(due, date(due) < today() && status != "done", false)'
  priority_label: |
    if(priority == 1, "High",
      if(priority == 2, "Medium", "Low"))

properties:
  formula.days_until_due:
    displayName: "Days Until Due"
  formula.priority_label:
    displayName: "Priority"

views:
  - type: table
    name: "Active Tasks"
    filters:
      and:
        - 'status != "done"'
    order:
      - file.name
      - status
      - formula.priority_label
      - due
      - formula.days_until_due
    groupBy:
      property: status
      direction: ASC
    summaries:
      formula.days_until_due: Average

  - type: table
    name: "Completed"
    filters:
      and:
        - 'status == "done"'
    order:
      - file.name
      - completed_date`,

  reading: `filters:
  or:
    - file.hasTag("book")
    - file.hasTag("article")

formulas:
  reading_time: 'if(pages, (pages * 2).toString() + " min", "")'
  status_icon: |
    if(status == "reading", icon("book-open"),
      if(status == "done", icon("check-circle"), icon("bookmark")))
  year_read: 'if(finished_date, date(finished_date).year, "")'

properties:
  formula.status_icon:
    displayName: ""
  formula.reading_time:
    displayName: "Est. Time"

views:
  - type: table
    name: "Reading List"
    filters:
      and:
        - 'status == "to-read"'
    order:
      - file.name
      - author
      - pages
      - formula.reading_time

  - type: cards
    name: "Library"
    order:
      - cover
      - file.name
      - author
      - formula.status_icon
    filters:
      not:
        - 'status == "dropped"'`,

  daily: `filters:
  and:
    - file.inFolder("Daily Notes")
    - '/^\\d{4}-\\d{2}-\\d{2}$/.matches(file.basename)'

formulas:
  word_estimate: '(file.size / 5).round(0)'
  day_of_week: 'date(file.basename).format("dddd")'

properties:
  formula.day_of_week:
    displayName: "Day"
  formula.word_estimate:
    displayName: "~Words"

views:
  - type: table
    name: "Recent Notes"
    limit: 30
    order:
      - file.name
      - formula.day_of_week
      - formula.word_estimate
      - file.mtime`,
};

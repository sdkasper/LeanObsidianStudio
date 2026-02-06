const output = document.getElementById("output");
const prompt = document.getElementById("prompt");
const toast = document.getElementById("toast");

const templates = {
  progress: {
    label: "Project Progress Bar",
    prompt:
      "A table view of project tasks that shows estimated effort, current effort, a percentage, and a visual progress bar.",
    yaml: `summaries:
  AvgCompletion: (values.sum() / values.filter(value.toString().trim() != "null").length).round(1)
filters:
  and:
    - file.ext == "md"
formulas:
  fPercentage: (currentEffort / estimatedEffort * 100).round(1)
  fProgressBar: ("▰".repeat(((formula.fPercentage / 10)).round(0)) + "▱".repeat(10 - ((formula.fPercentage / 10)).round(0)))
views:
  - type: table
    name: "Project Progress"
    filters:
      and:
        - file.tags.contains("Project")
    order:
      - file.name
      - estimatedEffort
      - currentEffort
      - formula.fPercentage
      - formula.fProgressBar
    sort:
      - property: formula.fPercentage
        direction: DESC
    summaries:
      currentEffort: AvgCompletion
    columnSize: {}`,
  },
  ratings: {
    label: "Star Ratings Table",
    prompt: "A table view that displays star ratings and cover images for notes.",
    yaml: `formulas:
  fStars: if(myRating.isEmpty() || myRating < 1 || myRating > 10, "11111".split("").map(icon("star-off")), "11111".split("").slice(0, number(myRating/2).floor()).map(icon("star")) + if(number(myRating/2) - number(myRating/2).floor() >= 0.5, [icon("star-half")], []))
  fFirstImage: if(file.embeds[0].containsAny("jpg","gif","webp","jpeg","avif","png"), file.embeds[0])
views:
  - type: table
    name: "Star Ratings"
    filters:
      and:
        - file.tags.contains("RatingDemo")
    order:
      - file.name
      - myRating
      - formula.fStars
      - formula.fFirstImage
    sort:
      - property: myRating
        direction: DESC
    columnSize: {}`,
  },
  travel: {
    label: "Travel Trip Map",
    prompt: "A map view of travel notes with coordinates, custom markers, and map tiles.",
    yaml: `views:
  - type: map
    name: "Trips"
    filters:
      and:
        - file.path.startsWith("01 Projects/Travel")
        - file.tags.contains("Travel/Trip")
    center: "[47.99666, 7.2874]"
    defaultZoom: 4.8
    maxZoom: 20
    coordinates: note.location
    markerIcon: note.icon
    markerColor: note.color
    mapTiles:
      - https://tiles.openfreemap.org/styles/liberty`,
  },
  birthday: {
    label: "Birthday Tracker",
    prompt: "A birthday tracker that shows upcoming birthdays and remaining days.",
    yaml: `formulas:
  fRemainingDays: |-
    ((number(
      date(today().format("YYYY") + "-" + birthday.format("MM-DD")) +
      if(date(today().format("YYYY") + "-" + birthday.format("MM-DD")) < today(), "1y", "0y")
    ) - number(today())) / 86400000).round()
  fAge: |-
    if(birthday.format("MM-DD") <= today().format("MM-DD"),
    today() - birthday, today() - (birthday + duration("1 year")))
views:
  - type: table
    name: "Birthday Tracker"
    filters:
      and:
        - file.tags.contains("Person")
        - "!birthday.isEmpty()"
    order:
      - file.name
      - birthday
      - formula.fRemainingDays
      - formula.fAge
    sort:
      - property: formula.fRemainingDays
        direction: ASC
    columnSize: {}`,
  },
  cleanup: {
    label: "Vault Cleaner",
    prompt: "A table that highlights notes missing tags or status fields.",
    yaml: `views:
  - type: table
    name: "Vault Cleaner"
    filters:
      or:
        - "file.tags.isEmpty()"
        - "note.status.isEmpty()"
    order:
      - file.name
      - file.folder
      - file.tags
      - note.status
    sort:
      - property: file.name
        direction: ASC
    columnSize: {}`,
  },
  summary: {
    label: "Content Summary",
    prompt: "A content summary that totals word counts per note.",
    yaml: `summaries:
  TotalWords: values.sum()
views:
  - type: table
    name: "Content Summary"
    filters:
      and:
        - file.ext == "md"
    order:
      - file.name
      - wordCount
    summaries:
      wordCount: TotalWords
    columnSize: {}`,
  },
};

const keywordMap = [
  { key: /progress|bar|effort/i, template: "progress" },
  { key: /rating|star/i, template: "ratings" },
  { key: /map|trip|travel/i, template: "travel" },
  { key: /birthday|age/i, template: "birthday" },
  { key: /clean|untag|vault/i, template: "cleanup" },
  { key: /summary|aggregate|total/i, template: "summary" },
];

const fallbackYaml = `views:
  - type: table
    name: "All Notes"
    filters:
      and:
        - file.ext == "md"
    order:
      - file.name
      - file.path
    sort:
      - property: file.name
        direction: ASC
    columnSize: {}`;

function renderOutput(value) {
  output.textContent = value.trim();
}

function applyTemplate(key) {
  const template = templates[key];
  if (!template) return;
  prompt.value = template.prompt;
  renderOutput(template.yaml);
}

function detectTemplate(value) {
  const match = keywordMap.find(({ key }) => key.test(value));
  return match ? templates[match.template].yaml : fallbackYaml;
}

function generateBase() {
  const text = prompt.value.trim();
  if (!text) {
    renderOutput(fallbackYaml);
    return;
  }
  renderOutput(detectTemplate(text));
}

function copyYaml() {
  const value = output.textContent.trim();
  if (!value || value.includes("appear here")) {
    return;
  }
  navigator.clipboard.writeText(value).then(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 1400);
  });
}

document.getElementById("generate").addEventListener("click", generateBase);
document.getElementById("copy").addEventListener("click", copyYaml);

document.querySelectorAll(".idea-card").forEach((card) => {
  card.addEventListener("click", () => {
    applyTemplate(card.dataset.template);
  });
});

applyTemplate("progress");

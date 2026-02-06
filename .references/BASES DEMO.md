summaries:
  MyAvg: (values.sum() / values.filter(value.toString().trim() != "null").length).round(1)
filters:
  and:
    - file.ext == "md"
formulas:
  fPercentage: (currentEffort / estimatedEffort * 100).round(1)
  fProgressBar1: ("🟩".repeat(((formula.fPercentage / 100) * 10).round(0)) + "⬛".repeat(((100 - formula.fPercentage) / 100 * 10).floor()))
  fProgressPct: progress / 100
  fProgressTxt: if(formula.fProgressPct> 0, (formula.fProgressPct * 100).round(), "0") + " %"
  fProgressBar: if(formula.fProgressPct * 10 > 0, "▰".repeat (number(formula.fProgressPct * 10))) + if((formula.fProgressPct * 10).floor() < 10, "▱▱▱▱▱▱▱▱▱▱".slice( 0, 10 - (formula.fProgressPct * 10).floor()), "").toString()
  fToday: today().format("YYYY-MM-DD")
  fFileNameDate: date(file.name.slice(0,10))
  fCreatedToday: today().format("YYYY-MM-DD") == note["created"]
  fCreatedYesterday: (today() - "1 d").format("YYYY-MM-DD") == note["created"]
  fCreatedSameDay: |
    this.created.format("YYYY-MM-DD") == note["created"]
  fRemainingDays: |-
    ((number(
      date(today().format("YYYY") + "-" + birthday.format("MM-DD")) +
      if(date(today().format("YYYY") + "-" + birthday.format("MM-DD")) < today(), "1y", "0y")
    ) - number(today())) / 86400000).round()
  fAge: |-
    if(birthday.format("MM-DD") <= today().format("MM-DD"),  
    today() - birthday, today() - (birthday + duration("1 year")))
  fVisualRating1: |-
    if([myRating] >= 9, "⭐⭐⭐⭐⭐ " + [myRating], 
     if([myRating] >= 7, "⭐⭐⭐⭐⚫ " + [myRating], 
     if([myRating] >= 5, "⭐⭐⭐⚫⚫ " + [myRating], 
     if([myRating] >= 3, "⭐⭐⚫⚫⚫ " + [myRating], 
     if([myRating] >= 1, "⭐⚫⚫⚫⚫ " + [myRating], 
     "⚫⚫⚫⚫⚫ " + [myRating]
     )))))
  fVisualRating2: if(myRating.isEmpty() || myRating < 1 || myRating > 10, "11111".split("").map(icon("star-off")), "11111".split("").slice(0, number(myRating/2).floor()).map(icon("star")) + if(number(myRating/2) - number(myRating/2).floor() >= 0.5, [icon("star-half")], []))
  fFirstImage: if(file.embeds[0].containsAny("jpg","gif","webp","jpeg","avif","png"), file.embeds[0])
views:
  - type: cards
    name: Recipes
    filters:
      and:
        - file.tags.contains("Recipe")
    order:
      - file.name
      - difficulty
      - rating
      - lastCooked
      - totalTime
    sort:
      - property: lastCooked
        direction: ASC
    image: note.featureImage
    imageAspectRatio: 0.55
    imageProperty: note.featureImage
    showPropertyTitles: true
  - type: table
    name: Progress Bar 1
    filters:
      and:
        - file.tags.contains("RatingDemo")
    order:
      - file.name
      - estimatedEffort
      - currentEffort
      - formula.fPercentage
      - formula.fProgressBar1
    sort:
      - property: file.name
        direction: DESC
      - property: formula.fPercentage
        direction: ASC
      - property: estimatedEffort
        direction: ASC
    summaries:
      currentEffort: MyAvg
    columnSize: {}
  - type: table
    name: Progress Bar 2
    filters:
      and:
        - file.tags.contains("RatingDemo")
    order:
      - file.name
      - progress
      - formula.fProgressPct
      - formula.fProgressTxt
      - formula.fProgressBar
    sort:
      - property: file.name
        direction: DESC
      - property: formula.fPercentage
        direction: ASC
      - property: estimatedEffort
        direction: ASC
    columnSize: {}
  - type: map
    name: Trips
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
      - https://tiles.openfreemap.org/styles/liberty
  - type: map
    name: TripContext
    filters:
      and:
        - file.path.startsWith("01 Projects/Travel")
        - this.file.hasLink(file)
    center: "[47.99666, 7.2874]"
    defaultZoom: 4.8
    maxZoom: 20
    coordinates: note.location
    markerIcon: note.icon
    markerColor: note.color
    mapTiles:
      - https://tiles.openfreemap.org/styles/dark
  - type: table
    name: Birthday Tracker
    filters:
      and:
        - file.tags.contains("Person")
        - "!birthday.isEmpty()"
    order:
      - file.name
      - birthday
      - formula.fRemainingDays
      - formula.fAge
  - type: table
    name: Date Basics
    order:
      - file.name
      - formula.fToday
      - formula.fFileNameDate
    sort:
      - property: formula.fFileNameDate
        direction: ASC
    columnSize: {}
  - type: table
    name: This Day in History
    filters:
      and:
        - file.name.contains(date(this.file.name).format("MM-DD").toString())
    order:
      - file.name
      - file.ctime
    sort: []
    columnSize: {}
  - type: table
    name: Created Today
    filters:
      and:
        - formula.fCreatedToday == true
    order:
      - file.name
      - created
      - formula.fCreatedToday
    sort: []
    columnSize:
      note.created: 209
  - type: table
    name: Created Yesterday
    filters:
      and:
        - formula.fCreatedYesterday == true
    order:
      - file.name
      - created
      - formula.fCreatedYesterday
    sort: []
    columnSize:
      note.created: 209
  - type: table
    name: Created Same Day as Main Note
    filters:
      and:
        - formula.fCreatedSameDay == true
    order:
      - file.name
      - created
      - formula.fCreatedSameDay
    sort: []
    columnSize:
      note.created: 209
  - type: table
    name: Visual Ratings
    filters:
      and:
        - file.tags.contains("RatingDemo")
    order:
      - file.name
      - formula.fVisualRating1
      - formula.fVisualRating2
    image: formula.fFirstImage
    imageAspectRatio: 1
  - type: cards
    name: First image as cover
    filters:
      and:
        - file.tags.contains("RatingDemo")
    order:
      - file.name
      - formula.fFirstImage
    image: formula.fFirstImage
  - type: table
    name: Dynamic MoC
    filters:
      and:
        - file.inFolder(this.file.folder)
    order:
      - file.name
      - file.tags
      - file.folder
    columnSize:
      file.name: 155

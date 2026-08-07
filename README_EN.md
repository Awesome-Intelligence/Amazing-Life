# Amazing Life

### Goal management in Obsidian, as simple as writing a diary

---

> "I set goals every year, and I forget them every year."
>
> If that's you too, this might be a little different.

---

## Do you ever feel confused about these?

- You've written down a bunch of goals, but you don't know how they relate to each other
- You've done a lot of things, but you don't feel like you're "making progress"
- At year-end review, you realize you forgot the goals you set at the beginning of the year
- You've tried all kinds of goal management apps, and they all ended up gathering dust

What's the problem?

**Between your goals and your actions, there's a missing "thread".**

---

## 🌲 Build a Goal Tree First

We designed a **4-level goal structure**:

```
Life Goals (Level 1)
        ↓
Phase Goals (Level 2)       ← e.g. "Become a tech expert before 35"
        ↓
Yearly Goals (Level 3)       ← e.g. "Improve technical depth in 2026"
        ↓
Short-term Goals (Level 4)  ← e.g. "Complete system design docs in Q3"
```

This isn't a man-made hierarchy.

**It's a structure that already exists.**

Every daily action belongs to some short-term goal;
every short-term goal belongs to some yearly goal;
every yearly goal belongs to some phase goal;
every phase goal leads toward a life goal.

The plugin automatically calculates: **When you complete a short-term goal, the parent goal's progress updates automatically.**

You don't need to manually update progress. You just do things.

---

## 📝 Then, work like you're writing a diary

In Amazing Life, you just need to:

```
Today I finished the first draft of product design  #goal/career #noteworthy
```

That's it. Those few words after `#goal/career` will:

1. **Link to the corresponding goal** - the system knows you're working toward this goal
2. **Record in the goal's mention history** - you can later review "what did I do for this goal during this time"
3. **If tagged #noteworthy** - automatically summarized into your weekly/monthly notes as review material

You're not "managing goals". You're just **recording what you're doing**.

Goals automatically "see" your effort.

---

## 🌀 Two Threads Woven Together

Amazing Life has two interwoven threads:

**Vertical thread: the goal hierarchy**

- Life → Phase → Year → Short-term
- Keeps you always aware of your big-picture direction

**Horizontal thread: continuous time records**

- Daily → Weekly → Monthly → Yearly
- Shows you your growth trajectory

When these two threads weave together, you get an **unprecedented clarity**:

> "I know what I'm working toward, I know what I've achieved, and I know what I still need to do."

This is more valuable than any goal management app's statistics.

---

## 💡 Design Philosophy

### Tools should be invisible

We believe: **The best tools are the ones you don't have to consciously use.**

Traditional goal management apps require you to:
- Open the app
- Switch to "Goals" module
- Create/update a goal
- Switch to "Tasks" module
- Create/update a task
- Switch to "Diary" module
- Write today's entry

By the time you've switched through all that, the urge to write in your diary is gone.

Amazing Life's approach: **Let you casually complete goal management while doing things you're already doing.**

You were going to write in your diary anyway. Just add `#goal/xxx` — that's the entire operation.

### The Path of Least Resistance

Humans are naturally lazy — and that's not a flaw, it's an evolutionary energy-saving instinct.

Anything that requires "extra steps" will be abandoned in the long run.

So we placed the entry point for goal management in something you do every day: **writing in your diary.**

You just write. The plugin works silently in the background.

### Markdown is Forever

We chose Markdown files for data storage because:

- **You own your data** — not some cloud service's database, not some company's server. Just your own .md files.
- **Open format** — can still be opened in 50 years. Don't worry about an app shutting down and all your data disappearing.
- **Portable** — today you use Obsidian, tomorrow you can use Logseq/Tana/any tool, data migrates directly.

We don't want to build a "lock-in" plugin. We want to build a tool you can "leave anytime."

Because only when you can leave anytime is staying a genuine choice.

---

## ✨ Key Features

### 🎯 4-Level Goal System

- Life Goals → Phase Goals → Yearly Goals → Short-term Goals
- Automatic progress aggregation — parent goal progress is automatically calculated from child goals

### 📝 Create and link tasks right in your diary

```
## Today's Log

Finished the first draft of product design in the morning  #goal/career #noteworthy

- [ ] Prepare promotion presentation materials  #goal/career
- [ ] Reply to team emails  #task/daily
```

**Creating and linking tasks takes just one line:**

- `- [ ]` creates a todo task (standard Markdown checkbox syntax)
- `#goal/xxx` links the task to the corresponding goal
- `#task/xxx` adds a type tag to the task (e.g. "important", "daily", "learning")
- `#noteworthy` marks important content, auto-summarized into weekly/monthly notes

**You don't need to enter a "task management" module.** Tasks are right in your diary, alongside your thoughts, feelings, and notes.

### 📊 Multiple Views

- **Dashboard** - Today's todos, this week's completions, goal progress at a glance
- **List View** - Table format to view all goals
- **Kanban View** - Group by status/hierarchy, drag-and-drop management
- **Gallery View** - Card grid, intuitive display
- **Calendar View** - View task distribution by date

### 📁 Data Storage

- All data stored as `.md` files
- Full control over your data
- Sync with Obsidian to any device
- Works with Dataview for free queries

---

## 🚀 Quick Start

### 1. Install the Plugin

Search "Amazing Life" in the Obsidian Community Plugins marketplace and install.

### 2. Create a Goal

1. Open the Amazing Life Dashboard
2. Click "+ Add Goal"
3. Choose a level (Life/Phase/Yearly/Short-term)
4. Fill in the name and description

### 3. Work in Your Diary

```
## Today's Log

Finished the first draft of product design in the morning  #goal/career #noteworthy

- [ ] Prepare promotion presentation materials  #goal/career
- [ ] Reply to team emails  #task/daily

The project is progressing faster than expected, hope to keep this pace  #goal/projectA
```

### 4. View Progress

- Open the Dashboard to see today's todos and this week's completions
- Go to Goal Details to view mention history and progress changes
- Open weekly/monthly notes to see summaries of important entries

---

## 📋 Workflow Examples

**Daily**
```
Open diary → Log todos/progress → Link with tags → Mark important items
```

**Weekly**
```
Open weekly note → Summarize #noteworthy → Review goal progress → Plan next week
```

**Monthly/Yearly**
```
Review and summarize → Analyze progress trends → Adjust goal direction → Set new goals
```

---

## 🔧 Technical Features

| Feature | Description |
|---------|-------------|
| Markdown-first | All data stored as .md files |
| Tag parsing | Auto-recognize goal/task tags in diary entries |
| Dataview support | Query any data with Dataview |
| Multi-device sync | Plugin data follows wherever Obsidian syncs |
| Theme adaptation | Auto-adapts to Obsidian theme colors |
| Custom fields | Support for custom goal fields, flexible extension |

---

## 📂 Data Structure

```
vault/
├── Daily/                    # Daily notes (configurable)
├── Weekly/                   # Weekly notes (configurable)
├── Monthly/                  # Monthly notes (configurable)
├── Yearly/                   # Yearly notes (configurable)
├── Phases/                   # Phase notes (configurable)
└── Amazing Life/             # Plugin data directory (configurable)
    ├── goals/                # Goal files
    │   ├── _index.md
    │   ├── career.md
    │   └── projectA.md
    ├── tasks/                # Task files
    │   ├── _index.md
    │   └── task-001.md
    ├── Covers/               # Cover images
    └── config.json           # Plugin configuration
```

---

## 🌱 Why This Sticks Long-Term

You may have experienced this:

- Downloaded a goal management app, used it for two weeks, gave up
- Bought a course, forgot everything after finishing
- Made a perfect plan, executed it for three days

**Why?**

Because all these methods ask you to **do something extra**. And "extra" means spending willpower. Willpower is limited — once it's gone, it's gone.

Amazing Life's design goal: **Goal management that doesn't drain your willpower.**

You don't need the action of "opening the app to update progress."
You don't need the mental load of "remembering which goals to push today."
You don't need the maintenance work of "regularly syncing data."

**You just keep writing in your diary.**

Goals grow naturally in your diary, are visualized in the dashboard, and are auto-summarized in weekly/monthly notes.

This isn't a new habit. It's a thin layer of framework layered on top of your existing habits.

---

## 🤝 Conclusion

Amazing Life is built on the Obsidian ecosystem, a tribute to all efficiency seekers.

If you find this plugin helpful, please give us a Star on GitHub!

---

**Made with ❤️ for Obsidian Users**

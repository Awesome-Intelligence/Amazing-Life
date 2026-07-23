"use strict";var S=Object.defineProperty;var $=Object.getOwnPropertyDescriptor;var G=Object.getOwnPropertyNames;var C=Object.prototype.hasOwnProperty;var L=(o,t)=>{for(var e in t)S(o,e,{get:t[e],enumerable:!0})},M=(o,t,e,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of G(t))!C.call(o,s)&&s!==e&&S(o,s,{get:()=>t[s],enumerable:!(a=$(t,s))||a.enumerable});return o};var N=o=>M(S({},"__esModule",{value:!0}),o);var D={};L(D,{default:()=>P});module.exports=N(D);var m=require("obsidian");var d={dataPath:"Amazing Life",dailyPath:"Daily",weeklyPath:"Weekly",monthlyPath:"Monthly",yearlyPath:"Yearly",phasePath:"Phases",goalTagPrefix:"\u76EE\u6807",taskTagPrefix:"\u4EFB\u52A1",noteworthyTag:"noteworthy",autoProgressUpdate:!0};var v=class{goalTagPattern;taskTagPattern;noteworthyPattern;taskCheckboxPattern;constructor(t){this.updatePatterns(t)}updatePatterns(t){this.goalTagPattern=new RegExp(`#${t.goalTagPrefix}/([^\\s#]+)`,"g"),this.taskTagPattern=new RegExp(`#${t.taskTagPrefix}/([^\\s#]+)`,"g"),this.noteworthyPattern=new RegExp(`#${t.noteworthyTag}`,"gi"),this.taskCheckboxPattern=/^- \[([ x>])\]/}parseLines(t){return t.split(`
`).map((a,s)=>this.parseLine(a,s+1))}parseLine(t,e){let a=this.extractGoalTags(t),s=this.extractTaskTags(t),i=this.noteworthyPattern.test(t),n=this.taskCheckboxPattern.test(t),l;if(n){let c=t.match(this.taskCheckboxPattern);if(c){let h=c[1];h==="x"?l="completed":h===">"?l="in-progress":l="pending"}}let f=(t.match(/#[\w/]+/g)||[]).filter(c=>{let h=c.slice(1);return!h.startsWith("\u76EE\u6807/")&&!h.startsWith("\u4EFB\u52A1/")&&h.toLowerCase()!=="noteworthy"}).map(c=>c.slice(1));return{lineNumber:e,content:t,isTask:n,taskStatus:l,goalTags:a,taskTags:s,isNoteworthy:i,categoryTags:f}}extractGoalTags(t){let e=t.match(this.goalTagPattern);return e?e.map(a=>a.slice(1)):[]}extractTaskTags(t){let e=t.match(this.taskTagPattern);return e?e.map(a=>a.slice(1)):[]}extractNoteworthyLines(t){return this.parseLines(t).filter(e=>e.isNoteworthy)}extractTaskLines(t){return this.parseLines(t).filter(e=>e.isTask)}containsGoalTag(t,e){return this.extractGoalTags(t).some(s=>s.toLowerCase()===e.toLowerCase())}containsTaskTag(t,e){return this.extractTaskTags(t).some(s=>s.toLowerCase()===e.toLowerCase())}};var p=require("obsidian"),x=class{app;settings;constructor(t,e){this.app=t,this.settings=e}updateSettings(t){this.settings=t}getDataPath(){return this.settings.dataPath}getGoalsPath(){return`${this.settings.dataPath}/goals`}getTasksPath(){return`${this.settings.dataPath}/tasks`}async ensureDirectory(t){this.app.vault.getAbstractFileByPath(t)||await this.app.vault.createFolder(t)}async ensureDirectories(){await this.ensureDirectory(this.settings.dataPath),await this.ensureDirectory(this.getGoalsPath()),await this.ensureDirectory(this.getTasksPath()),await this.ensureDirectory(this.settings.dailyPath),await this.ensureDirectory(this.settings.weeklyPath),await this.ensureDirectory(this.settings.monthlyPath),await this.ensureDirectory(this.settings.yearlyPath),await this.ensureDirectory(this.settings.phasePath)}async readFile(t){let e=this.app.vault.getAbstractFileByPath(t);return e instanceof p.TFile?await this.app.vault.read(e):null}async writeFile(t,e){let a=this.app.vault.getAbstractFileByPath(t);a instanceof p.TFile?await this.app.vault.modify(a,e):await this.app.vault.create(t,e)}async createFile(t,e){return await this.app.vault.create(t,e)}async deleteFile(t){let e=this.app.vault.getAbstractFileByPath(t);e instanceof p.TFile&&await this.app.vault.delete(e)}getFilesInFolder(t){if(!this.app.vault.getAbstractFileByPath(t))return[];let a=[];for(let s of this.app.vault.getAllLoadedFiles())s.path.startsWith(t+"/")&&s instanceof p.TFile&&a.push(s);return a}getFileCache(t){return this.app.metadataCache.getFileCache(t)}parseFrontmatter(t){let e=this.getFileCache(t);return e?.frontmatter?e.frontmatter:{}}generateId(t){let e=Date.now().toString(36),a=Math.random().toString(36).substring(2,6);return`${t}-${e}${a}`}getDailyNote(t){let e=`${this.settings.dailyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getWeeklyNote(t){let e=`${this.settings.weeklyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getMonthlyNote(t){let e=`${this.settings.monthlyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getYearlyNote(t){let e=`${this.settings.yearlyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getDailyNotePath(t){return`${this.settings.dailyPath}/${t}.md`}getGoalPath(t){return`${this.getGoalsPath()}/${t}.md`}getTaskPath(t){return`${this.getTasksPath()}/${t}.md`}};var A=class{constructor(t,e){this.storage=t;this.settings=e}goals=new Map;goalsByLevel=new Map;updateSettings(t){this.settings=t}async loadGoals(){this.goals.clear(),this.goalsByLevel.clear();let t=this.storage.getFilesInFolder(this.storage.getGoalsPath());for(let e of t){if(e.name==="_index.md")continue;let a=await this.storage.readFile(e.path);if(a){let s=this.parseGoalFromContent(e,a);s&&this.goals.set(s["A-id"],s)}}for(let[e,a]of this.goals){let s=this.goalsByLevel.get(a["A-level"])||[];s.push(a),this.goalsByLevel.set(a["A-level"],s)}}parseGoalFromContent(t,e){let a=this.storage.parseFrontmatter(t);return a["A-type"]!=="goal"?null:{"A-id":String(a["A-id"]||t.basename),"A-type":"goal","A-title":String(a["A-title"]||""),"A-level":Number(a["A-level"]),"A-parent":a["A-parent"]?String(a["A-parent"]):null,"A-status":a["A-status"]||"active","A-progress":Number(a["A-progress"]||0),"A-weight":Number(a["A-weight"]||1),"A-start":String(a["A-start"]||new Date().toISOString().split("T")[0]),"A-due":a["A-due"]?String(a["A-due"]):null,"A-created":String(a["A-created"]||""),"A-updated":String(a["A-updated"]||new Date().toISOString())}}async createGoal(t){let e=this.storage.generateId("goal"),a=new Date().toISOString().split("T")[0],s={"A-id":e,"A-type":"goal","A-title":t.title,"A-level":t.level,"A-parent":t.parent||null,"A-status":"active","A-progress":0,"A-weight":1,"A-start":a,"A-due":t.due||null,"A-created":a,"A-updated":a},i=this.generateGoalContent(s,t.description);await this.storage.writeFile(this.storage.getGoalPath(e),i),this.goals.set(e,s);let n=this.goalsByLevel.get(t.level)||[];return n.push(s),this.goalsByLevel.set(t.level,n),s}generateGoalContent(t,e){let a=["---",`A-id: ${t["A-id"]}`,`A-type: ${t["A-type"]}`,`A-title: ${t["A-title"]}`,`A-level: ${t["A-level"]}`,`A-parent: ${t["A-parent"]||""}`,`A-status: ${t["A-status"]}`,`A-progress: ${t["A-progress"]}`,`A-weight: ${t["A-weight"]}`,`A-start: ${t["A-start"]}`,`A-due: ${t["A-due"]||""}`,`A-created: ${t["A-created"]}`,`A-updated: ${t["A-updated"]}`,"---","",`# ${t["A-title"]}`,""];if(e&&a.push("## \u6982\u8FF0","",e,""),t["A-parent"]){let s=this.goals.get(t["A-parent"]);s&&a.push("## \u7236\u76EE\u6807","",`- [[${t["A-parent"]}|${s["A-title"]}]]`,"")}return a.push("## \u5173\u8054\u4EFB\u52A1","","## \u8FDB\u5EA6\u8BB0\u5F55",""),a.join(`
`)}async updateGoal(t,e){let a=this.goals.get(t);if(!a)return null;let s=new Date().toISOString().split("T")[0];e.title!==void 0&&(a["A-title"]=e.title),e.due!==void 0&&(a["A-due"]=e.due),e.status!==void 0&&(a["A-status"]=e.status),e.progress!==void 0&&(a["A-progress"]=e.progress),a["A-updated"]=s;let i=await this.storage.readFile(this.storage.getGoalPath(t));if(i){let n=this.updateGoalInContent(i,a);await this.storage.writeFile(this.storage.getGoalPath(t),n)}return a}updateGoalInContent(t,e){let a=t.split(`
`),s=[],i=!1;for(let n of a){if(n==="---"){i=!i,s.push(n);continue}i?n.startsWith("A-title:")?s.push(`A-title: ${e["A-title"]}`):n.startsWith("A-status:")?s.push(`A-status: ${e["A-status"]}`):n.startsWith("A-progress:")?s.push(`A-progress: ${e["A-progress"]}`):n.startsWith("A-due:")?s.push(`A-due: ${e["A-due"]||""}`):n.startsWith("A-updated:")?s.push(`A-updated: ${e["A-updated"]}`):s.push(n):n.startsWith("# ")?s.push(`# ${e["A-title"]}`):s.push(n)}return s.join(`
`)}async deleteGoal(t){let e=this.goals.get(t);if(!e)return;await this.storage.deleteFile(this.storage.getGoalPath(t)),this.goals.delete(t);let a=this.goalsByLevel.get(e["A-level"]);if(a){let s=a.findIndex(i=>i["A-id"]===t);s!==-1&&a.splice(s,1)}}getGoal(t){return this.goals.get(t)||null}getGoalsByLevel(t){return this.goalsByLevel.get(t)||[]}getAllGoals(){return Array.from(this.goals.values())}getGoalTree(){let t=[];for(let e of this.goals.values())(e["A-level"]===1||!e["A-parent"])&&t.push(this.buildGoalTree(e));return t}buildGoalTree(t){let e=[];for(let a of this.goals.values())a["A-parent"]===t["A-id"]&&e.push(this.buildGoalTree(a));return{goal:t,children:e,tasks:[],aggregatedProgress:this.calculateAggregatedProgress(t,e)}}calculateAggregatedProgress(t,e){if(e.length===0)return t["A-progress"];let a=t["A-weight"],s=t["A-progress"]*t["A-weight"];for(let i of e)a+=i.goal["A-weight"],s+=i.aggregatedProgress*i.goal["A-weight"];return Math.round(s/a)}async updateProgressFromTasks(t,e){let a=e.filter(n=>n["A-goal"]===t);if(a.length===0)return 0;let s=a.filter(n=>n["A-status"]==="completed").length,i=Math.round(s/a.length*100);return await this.updateGoal(t,{progress:i}),i}getDescendants(t){let e=[],a=s=>{for(let i of this.goals.values())i["A-parent"]===s&&(e.push(i),a(i["A-id"]))};return a(t),e}};var k=class{constructor(t,e){this.storage=t;this.settings=e}tasks=new Map;tasksByGoal=new Map;updateSettings(t){this.settings=t}async loadTasks(){this.tasks.clear(),this.tasksByGoal.clear();let t=this.storage.getFilesInFolder(this.storage.getTasksPath());for(let e of t){if(e.name==="_index.md")continue;let a=await this.storage.readFile(e.path);if(a){let s=this.parseTaskFromContent(e,a);if(s&&(this.tasks.set(s["A-id"],s),s["A-goal"])){let i=this.tasksByGoal.get(s["A-goal"])||[];i.push(s),this.tasksByGoal.set(s["A-goal"],i)}}}}parseTaskFromContent(t,e){let a=this.storage.parseFrontmatter(t);if(a["A-type"]!=="task")return null;let s=a["A-tags"],i=[];return Array.isArray(s)?i=s.map(String):typeof s=="string"&&(i=[s]),{"A-id":String(a["A-id"]||t.basename),"A-type":"task","A-title":String(a["A-title"]||""),"A-status":a["A-status"]||"pending","A-priority":Number(a["A-priority"]||3),"A-due":a["A-due"]?String(a["A-due"]):null,"A-goal":a["A-goal"]?String(a["A-goal"]):null,"A-tags":i,"A-source":a["A-source"]?String(a["A-source"]):null,"A-created":String(a["A-created"]||""),"A-completed":a["A-completed"]?String(a["A-completed"]):null}}async createTask(t){let e=this.storage.generateId("task"),a=new Date().toISOString().split("T")[0],s={"A-id":e,"A-type":"task","A-title":t.title,"A-status":"pending","A-priority":t.priority||3,"A-due":t.due||null,"A-goal":t.goal||null,"A-tags":t.tags||[],"A-source":t.source||null,"A-created":a,"A-completed":null},i=this.generateTaskContent(s);if(await this.storage.writeFile(this.storage.getTaskPath(e),i),this.tasks.set(e,s),s["A-goal"]){let n=this.tasksByGoal.get(s["A-goal"])||[];n.push(s),this.tasksByGoal.set(s["A-goal"],n)}return s}generateTaskContent(t){let e=["---",`A-id: ${t["A-id"]}`,`A-type: ${t["A-type"]}`,`A-title: ${t["A-title"]}`,`A-status: ${t["A-status"]}`,`A-priority: ${t["A-priority"]}`,`A-due: ${t["A-due"]||""}`,`A-goal: ${t["A-goal"]||""}`,"A-tags:",...t["A-tags"].map(a=>`  - ${a}`),`A-source: ${t["A-source"]||""}`,`A-created: ${t["A-created"]}`,`A-completed: ${t["A-completed"]||""}`,"---","",`# ${t["A-title"]}`,"","## \u72B6\u6001","",`- [ ] \u521B\u5EFA\u4E8E ${t["A-created"]}`];return t["A-due"]&&e.push(`- [ ] \u622A\u6B62 ${t["A-due"]}`),t["A-goal"]&&e.push("","## \u5173\u8054\u76EE\u6807",""),e.join(`
`)}async updateTask(t,e){let a=this.tasks.get(t);if(!a)return null;let s=new Date().toISOString().split("T")[0];if(e.title!==void 0&&(a["A-title"]=e.title),e.priority!==void 0&&(a["A-priority"]=e.priority),e.due!==void 0&&(a["A-due"]=e.due),e.tags!==void 0&&(a["A-tags"]=e.tags),e.status!==void 0){let n=a["A-status"]!==e.status;a["A-status"]=e.status,n&&(e.status==="completed"?a["A-completed"]=s:a["A-completed"]=null)}let i=await this.storage.readFile(this.storage.getTaskPath(t));if(i){let n=this.updateTaskInContent(i,a);await this.storage.writeFile(this.storage.getTaskPath(t),n)}return a}updateTaskInContent(t,e){let a=t.split(`
`),s=[],i=!1;for(let n of a){if(n==="---"){i=!i,s.push(n);continue}if(i)if(n.startsWith("A-title:"))s.push(`A-title: ${e["A-title"]}`);else if(n.startsWith("A-status:"))s.push(`A-status: ${e["A-status"]}`);else if(n.startsWith("A-priority:"))s.push(`A-priority: ${e["A-priority"]}`);else if(n.startsWith("A-due:"))s.push(`A-due: ${e["A-due"]||""}`);else if(n.startsWith("A-completed:"))s.push(`A-completed: ${e["A-completed"]||""}`);else if(n==="A-tags:"){if(s.push(n),e["A-tags"].length===0)s.push("  - ");else for(let y of e["A-tags"])s.push(`  - ${y}`);let l=a[a.indexOf(n)+1];for(;l&&l.startsWith("  - ");)a.splice(a.indexOf(l),1),l=a[a.indexOf(n)+1]}else s.push(n);else n.startsWith("# ")?s.push(`# ${e["A-title"]}`):s.push(n)}return s.join(`
`)}async deleteTask(t){let e=this.tasks.get(t);if(e&&(await this.storage.deleteFile(this.storage.getTaskPath(t)),this.tasks.delete(t),e["A-goal"])){let a=this.tasksByGoal.get(e["A-goal"]);if(a){let s=a.findIndex(i=>i["A-id"]===t);s!==-1&&a.splice(s,1)}}}getTask(t){return this.tasks.get(t)||null}getTasksByGoal(t){return this.tasksByGoal.get(t)||[]}getAllTasks(){return Array.from(this.tasks.values())}getTodayTasks(){let t=new Date().toISOString().split("T")[0];return this.getAllTasks().filter(e=>e["A-status"]!=="completed"&&e["A-status"]!=="cancelled"&&e["A-due"]===t)}getOverdueTasks(){let t=new Date().toISOString().split("T")[0];return this.getAllTasks().filter(e=>e["A-status"]!=="completed"&&e["A-status"]!=="cancelled"&&e["A-due"]!==null&&e["A-due"]<t)}getInProgressTasks(){return this.getAllTasks().filter(t=>t["A-status"]==="in-progress")}getPendingTasks(){return this.getAllTasks().filter(t=>t["A-status"]==="pending")}getCompletedTasks(){return this.getAllTasks().filter(t=>t["A-status"]==="completed")}async completeTask(t){return this.updateTask(t,{status:"completed"})}async cancelTask(t){return this.updateTask(t,{status:"cancelled"})}async startTask(t){return this.updateTask(t,{status:"in-progress"})}};var T=class{constructor(t,e){this.storage=t;this.settings=e}updateSettings(t){this.settings=t}getToday(){return new Date().toISOString().split("T")[0]}getCurrentWeekKey(){let t=new Date,e=new Date(t.getFullYear(),0,1),a=Math.floor((t.getTime()-e.getTime())/(24*60*60*1e3)),s=Math.ceil((a+e.getDay()+1)/7);return`${t.getFullYear()}-W${s.toString().padStart(2,"0")}`}getCurrentYearMonth(){let t=new Date;return`${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,"0")}`}getCurrentYear(){return new Date().getFullYear().toString()}async getDailyNote(t){return this.storage.getDailyNote(t)}async getDailyNoteContent(t){return this.storage.readFile(this.storage.getDailyNotePath(t))}async getOrCreateTodayNote(){let t=this.getToday(),e=await this.getDailyNoteContent(t);if(e!==null)return e;let a=this.generateDailyNoteTemplate(t);return await this.storage.createFile(this.storage.getDailyNotePath(t),a),a}generateDailyNoteTemplate(t){let e=new Date(t),a=["\u5468\u65E5","\u5468\u4E00","\u5468\u4E8C","\u5468\u4E09","\u5468\u56DB","\u5468\u4E94","\u5468\u516D"][e.getDay()];return`---
date: ${t}
weekday: ${a}
---

# ${t} ${a}

## \u4ECA\u65E5\u8BA1\u5212


## \u5B8C\u6210\u4EFB\u52A1


## \u8BB0\u5F55


## \u660E\u65E5\u8BA1\u5212

`}async getWeeklyNote(t){return this.storage.getWeeklyNote(t)}async getMonthlyNote(t){return this.storage.getMonthlyNote(t)}async getYearlyNote(t){return this.storage.getYearlyNote(t)}async getOrCreateWeeklyNote(t){let e=await this.storage.getWeeklyNote(t);if(e)return await this.storage.readFile(e.path)||"";let a=this.generateWeeklyNoteTemplate(t);return await this.storage.createFile(`${this.settings.weeklyPath}/${t}.md`,a),a}generateWeeklyNoteTemplate(t){return`---
A-type: weekly
A-week: ${t}
---

# ${t} \u5468\u8BB0

## \u672C\u5468\u76EE\u6807


## \u672C\u5468\u6210\u5C31
\`\`\`dataview
TABLE date, substring(source.ctext, 0, 150) as \u5185\u5BB9
FROM "${this.settings.dailyPath}"
WHERE contains(source.ctext, "#noteworthy")
SORT date DESC
\`\`\`

## \u4E0B\u5468\u8BA1\u5212

`}async getOrCreateMonthlyNote(t){let e=await this.storage.getMonthlyNote(t);if(e)return await this.storage.readFile(e.path)||"";let a=this.generateMonthlyNoteTemplate(t);return await this.storage.createFile(`${this.settings.monthlyPath}/${t}.md`,a),a}generateMonthlyNoteTemplate(t){return`---
A-type: monthly
A-month: ${t}
---

# ${t} \u6708\u8BB0

## \u672C\u6708\u76EE\u6807\u56DE\u987E


## \u672C\u6708\u6210\u5C31
\`\`\`dataview
TABLE date, substring(source.ctext, 0, 150) as \u5185\u5BB9
FROM "${this.settings.dailyPath}"
WHERE date >= ${t}-01 AND date <= ${t}-31
WHERE contains(source.ctext, "#noteworthy")
SORT date DESC
\`\`\`

## \u4E0B\u6708\u8BA1\u5212

`}async getOrCreateYearlyNote(t){let e=await this.storage.getYearlyNote(t);if(e)return await this.storage.readFile(e.path)||"";let a=this.generateYearlyNoteTemplate(t);return await this.storage.createFile(`${this.settings.yearlyPath}/${t}.md`,a),a}generateYearlyNoteTemplate(t){return`---
A-type: yearly
A-year: ${t}
---

# ${t} \u5E74\u8BB0

## \u5E74\u5EA6\u76EE\u6807


## \u5E74\u5EA6\u6210\u5C31
\`\`\`dataview
TABLE date, substring(source.ctext, 0, 150) as \u5185\u5BB9
FROM "${this.settings.dailyPath}"
WHERE date >= ${t}-01-01 AND date <= ${t}-12-31
WHERE contains(source.ctext, "#noteworthy")
SORT date DESC
LIMIT 50
\`\`\`

## \u91CC\u7A0B\u7891


## \u660E\u5E74\u5C55\u671B

`}};var g=require("obsidian");var b=class extends g.PluginSettingTab{settings;onSettingsChange;constructor(t,e,a,s){super(t,e),this.settings=a,this.onSettingsChange=s}display(){let{containerEl:t}=this;t.empty(),t.createEl("h2",{text:"Amazing Life \u8BBE\u7F6E"}),t.createEl("h3",{text:"\u76EE\u5F55\u8BBE\u7F6E"}),new g.Setting(t).setName("\u63D2\u4EF6\u6570\u636E\u76EE\u5F55").setDesc("\u5B58\u50A8\u76EE\u6807\u548C\u4EFB\u52A1\u6570\u636E").addText(e=>{e.setValue(this.settings.dataPath),e.onChange(a=>{this.settings.dataPath=a||d.dataPath,this.onSettingsChange(this.settings)})}),new g.Setting(t).setName("\u65E5\u8BB0\u76EE\u5F55").setDesc("\u6BCF\u65E5\u65E5\u8BB0\u5B58\u653E\u4F4D\u7F6E").addText(e=>{e.setValue(this.settings.dailyPath),e.onChange(a=>{this.settings.dailyPath=a||d.dailyPath,this.onSettingsChange(this.settings)})}),new g.Setting(t).setName("\u5468\u8BB0\u76EE\u5F55").addText(e=>{e.setValue(this.settings.weeklyPath),e.onChange(a=>{this.settings.weeklyPath=a||d.weeklyPath,this.onSettingsChange(this.settings)})}),new g.Setting(t).setName("\u6708\u8BB0\u76EE\u5F55").addText(e=>{e.setValue(this.settings.monthlyPath),e.onChange(a=>{this.settings.monthlyPath=a||d.monthlyPath,this.onSettingsChange(this.settings)})}),new g.Setting(t).setName("\u5E74\u8BB0\u76EE\u5F55").addText(e=>{e.setValue(this.settings.yearlyPath),e.onChange(a=>{this.settings.yearlyPath=a||d.yearlyPath,this.onSettingsChange(this.settings)})}),new g.Setting(t).setName("\u9636\u6BB5\u6027\u8BB0\u5F55\u76EE\u5F55").setDesc("\u5B63\u5EA6/\u9636\u6BB5\u590D\u76D8\u5B58\u653E\u4F4D\u7F6E").addText(e=>{e.setValue(this.settings.phasePath),e.onChange(a=>{this.settings.phasePath=a||d.phasePath,this.onSettingsChange(this.settings)})}),t.createEl("h3",{text:"\u6807\u7B7E\u8BBE\u7F6E"}),new g.Setting(t).setName("\u76EE\u6807\u6807\u7B7E\u524D\u7F00").setDesc("\u7528\u4E8E #\u76EE\u6807/xxx \u6807\u7B7E").addText(e=>{e.setValue(this.settings.goalTagPrefix),e.onChange(a=>{this.settings.goalTagPrefix=a||d.goalTagPrefix,this.onSettingsChange(this.settings)})}),new g.Setting(t).setName("\u4EFB\u52A1\u6807\u7B7E\u524D\u7F00").setDesc("\u7528\u4E8E #\u4EFB\u52A1/xxx \u6807\u7B7E").addText(e=>{e.setValue(this.settings.taskTagPrefix),e.onChange(a=>{this.settings.taskTagPrefix=a||d.taskTagPrefix,this.onSettingsChange(this.settings)})}),new g.Setting(t).setName("\u91CD\u8981\u6807\u8BB0").setDesc("\u7528\u4E8E #noteworthy \u6807\u7B7E").addText(e=>{e.setValue(this.settings.noteworthyTag),e.onChange(a=>{this.settings.noteworthyTag=a||d.noteworthyTag,this.onSettingsChange(this.settings)})}),t.createEl("h3",{text:"\u5176\u4ED6\u8BBE\u7F6E"}),new g.Setting(t).setName("\u81EA\u52A8\u66F4\u65B0\u8FDB\u5EA6").setDesc("\u5B8C\u6210\u4EFB\u52A1\u65F6\u81EA\u52A8\u66F4\u65B0\u76EE\u6807\u8FDB\u5EA6").addToggle(e=>{e.setValue(this.settings.autoProgressUpdate),e.onChange(a=>{this.settings.autoProgressUpdate=a,this.onSettingsChange(this.settings)})})}};var r=require("obsidian"),u="amazing-life-dashboard",w=class extends r.ItemView{plugin;constructor(t,e){super(t),this.plugin=e}getViewType(){return u}getDisplayText(){return"Amazing Life"}getIcon(){return"target"}async onOpen(){await this.loadAndRender()}async onClose(){this.removeStyles()}async loadAndRender(){try{await this.plugin.getGoalManager().loadGoals(),await this.plugin.getTaskManager().loadTasks(),this.render()}catch(t){console.error("[AL] Error loading data:",t),new r.Notice("\u52A0\u8F7D\u6570\u636E\u5931\u8D25: "+t.message)}}render(){let t=this.contentEl;t.empty(),t.className="al-dashboard";let e=this.plugin.getGoalManager().getAllGoals(),a=this.plugin.getTaskManager().getAllTasks(),s=this.plugin.getTaskManager().getTodayTasks(),i=this.plugin.getTaskManager().getOverdueTasks(),n=this.plugin.getTaskManager().getCompletedTasks(),l=this.calculateWeekComplete(n),y=a.filter(f=>f["A-status"]!=="completed"&&f["A-status"]!=="cancelled").length;t.innerHTML=`
      <div class="al-page">
        <div class="al-header">
          <div class="al-header-left">
            <div class="al-title">
              <span>\u{1F3AF}</span>
              <span>Amazing Life</span>
            </div>
            <div class="al-date">${new Date().toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"})}</div>
          </div>
          <div class="al-header-actions">
            <button id="al-refresh-btn">
              <span>\u{1F504}</span>
              <span>\u5237\u65B0</span>
            </button>
            <button class="mod-cta" id="al-create-goal-btn">
              <span>+</span>
              <span>\u521B\u5EFA\u76EE\u6807</span>
            </button>
            <button class="mod-cta" id="al-create-task-btn">
              <span>+</span>
              <span>\u521B\u5EFA\u4EFB\u52A1</span>
            </button>
          </div>
        </div>
        
        <div class="al-body">
          <div class="al-main">
            <div class="al-stats">
              <div class="al-stat">
                <span class="al-stat-num">${s.length}</span>
                <span class="al-stat-label">\u4ECA\u65E5\u5F85\u529E</span>
              </div>
              <div class="al-stat">
                <span class="al-stat-num">${l}</span>
                <span class="al-stat-label">\u672C\u5468\u5B8C\u6210</span>
              </div>
              <div class="al-stat ${i.length>0?"al-stat-warning":""}">
                <span class="al-stat-num">${i.length}</span>
                <span class="al-stat-label">\u903E\u671F\u4EFB\u52A1</span>
              </div>
              <div class="al-stat">
                <span class="al-stat-num">${y}</span>
                <span class="al-stat-label">\u8FDB\u884C\u4E2D</span>
              </div>
            </div>
            
            <div class="al-panel">
              <div class="al-panel-header">
                <span>\u{1F4CB}</span>
                <span>\u4ECA\u65E5\u4EFB\u52A1</span>
                <span class="al-panel-count">${s.length}</span>
              </div>
              <div class="al-panel-body">
                ${s.length===0?this.renderEmpty("\u{1F4CB}","\u6682\u65E0\u4EFB\u52A1","\u70B9\u51FB\u53F3\u4E0A\u89D2\u6309\u94AE\u6DFB\u52A0\u4EFB\u52A1"):this.renderTasks(s)}
              </div>
            </div>
            
            <div class="al-panel">
              <div class="al-panel-header">
                <span>\u{1F3AF}</span>
                <span>\u76EE\u6807\u6982\u89C8</span>
                <span class="al-panel-count">${e.length}</span>
              </div>
              <div class="al-panel-body">
                ${e.length===0?this.renderEmpty("\u{1F3AF}","\u6682\u65E0\u76EE\u6807","\u70B9\u51FB\u53F3\u4E0A\u89D2\u6309\u94AE\u521B\u5EFA\u76EE\u6807"):this.renderGoals(e)}
              </div>
            </div>
          </div>
          
          <div class="al-sidebar">
            ${i.length>0?`
            <div class="al-panel al-panel-overdue">
              <div class="al-panel-header">
                <span>\u26A0\uFE0F</span>
                <span>\u903E\u671F\u4EFB\u52A1</span>
                <span class="al-panel-count al-count-overdue">${i.length}</span>
              </div>
              <div class="al-panel-body">
                ${this.renderTasks(i)}
              </div>
            </div>
            `:""}
            
            <div class="al-panel">
              <div class="al-panel-header">
                <span>\u26A1</span>
                <span>\u5FEB\u6377\u64CD\u4F5C</span>
              </div>
              <div class="al-panel-body">
                <button class="al-quick-btn" id="al-open-today">
                  <span>\u{1F4DD}</span>
                  <span>\u4ECA\u65E5\u65E5\u8BB0</span>
                </button>
                <button class="al-quick-btn" id="al-open-weekly">
                  <span>\u{1F4C5}</span>
                  <span>\u672C\u5468\u5468\u8BB0</span>
                </button>
                <button class="al-quick-btn" id="al-open-monthly">
                  <span>\u{1F4C6}</span>
                  <span>\u672C\u6708\u6708\u8BB0</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,this.bindEvents(),this.addStyles()}calculateWeekComplete(t){let e=new Date,a=new Date(e.getTime()-7*24*60*60*1e3);return t.filter(s=>s["A-completed"]?new Date(s["A-completed"])>=a:!1).length}renderEmpty(t,e,a){return`
      <div class="al-empty">
        <span>${t}</span>
        <div>${e}</div>
        <div class="al-empty-desc">${a}</div>
      </div>
    `}renderGoals(t){let e={1:"\u4EBA\u751F",2:"\u9636\u6BB5",3:"\u5E74\u5EA6",4:"\u77ED\u671F"};return t.slice(0,5).map(a=>`
      <div class="al-goal">
        <div class="al-goal-top">
          <span class="al-goal-level" data-level="${a["A-level"]}">${e[a["A-level"]]}</span>
          <span class="al-goal-status ${a["A-status"]}">${a["A-status"]==="active"?"\u8FDB\u884C\u4E2D":"\u5DF2\u5B8C\u6210"}</span>
        </div>
        <div class="al-goal-title">${a["A-title"]}</div>
        <div class="al-goal-progress">
          <div class="al-progress-bar">
            <div class="al-progress-fill" style="width: ${a["A-progress"]}%"></div>
          </div>
          <span>${a["A-progress"]}%</span>
        </div>
      </div>
    `).join("")}renderTasks(t){let e={1:"--text-red",2:"--text-orange",3:"--text-yellow",4:"--text-green",5:"--text-muted"};return t.slice(0,10).map(a=>`
      <div class="al-task" data-task-id="${a["A-id"]}">
        <div class="al-task-check ${a["A-status"]==="completed"?"checked":""}">
          ${a["A-status"]==="completed"?"\u2713":""}
        </div>
        <div class="al-task-content">
          <div class="al-task-title ${a["A-status"]==="completed"?"done":""}">${a["A-title"]}</div>
          <div class="al-task-meta">
            <span style="color: var(${e[a["A-priority"]]})">${["\u6700\u9AD8","\u9AD8","\u4E2D","\u4F4E","\u6700\u4F4E"][a["A-priority"]-1]}</span>
            ${a["A-due"]?`<span class="al-task-due">${a["A-due"]}</span>`:""}
          </div>
        </div>
      </div>
    `).join("")}bindEvents(){let t=this.contentEl;t.querySelector("#al-refresh-btn")?.addEventListener("click",()=>{new r.Notice("\u6B63\u5728\u5237\u65B0..."),this.loadAndRender()}),t.querySelector("#al-create-goal-btn")?.addEventListener("click",()=>{this.showCreateGoalModal()}),t.querySelector("#al-create-task-btn")?.addEventListener("click",()=>{this.showCreateTaskModal()}),t.querySelector("#al-open-today")?.addEventListener("click",()=>{this.openTodayNote()}),t.querySelector("#al-open-weekly")?.addEventListener("click",()=>{this.openWeeklyNote()}),t.querySelector("#al-open-monthly")?.addEventListener("click",()=>{this.openMonthlyNote()}),t.querySelectorAll(".al-task-check").forEach(e=>{e.addEventListener("click",async a=>{let i=a.target.closest(".al-task")?.getAttribute("data-task-id");i&&await this.toggleTaskStatus(i)})})}async toggleTaskStatus(t){let e=this.plugin.getTaskManager().getTask(t);if(e)try{e["A-status"]==="completed"?await this.plugin.getTaskManager().updateTask(t,{status:"pending"}):await this.plugin.getTaskManager().completeTask(t),this.loadAndRender()}catch(a){new r.Notice("\u66F4\u65B0\u5931\u8D25: "+a.message)}}showCreateGoalModal(){let t=document.createElement("div");t.className="al-modal",t.innerHTML=`
      <div class="al-modal-bg"></div>
      <div class="al-modal-box">
        <div class="al-modal-header">
          <span>\u{1F3AF} \u521B\u5EFA\u76EE\u6807</span>
          <button class="al-modal-close">\xD7</button>
        </div>
        <form id="al-goal-form">
          <div class="al-form-item">
            <label>\u76EE\u6807\u540D\u79F0</label>
            <input type="text" id="al-goal-title" required placeholder="\u4F8B\u5982\uFF1A\u5B66\u4E60\u4E00\u95E8\u65B0\u8BED\u8A00">
          </div>
          <div class="al-form-item">
            <label>\u76EE\u6807\u5C42\u7EA7</label>
            <select id="al-goal-level">
              <option value="1">\u{1F3C6} \u4EBA\u751F\u76EE\u6807</option>
              <option value="2">\u{1F4C5} \u9636\u6BB5\u76EE\u6807</option>
              <option value="3" selected>\u{1F4C6} \u5E74\u5EA6\u76EE\u6807</option>
              <option value="4">\u26A1 \u77ED\u671F\u76EE\u6807</option>
            </select>
          </div>
          <div class="al-form-item">
            <label>\u622A\u6B62\u65E5\u671F</label>
            <input type="date" id="al-goal-due">
          </div>
          <div class="al-form-actions">
            <button type="button" id="al-cancel-goal">\u53D6\u6D88</button>
            <button type="submit" class="mod-cta">\u521B\u5EFA</button>
          </div>
        </form>
      </div>
    `,document.body.appendChild(t);let e=()=>t.remove();t.querySelector(".al-modal-bg")?.addEventListener("click",e),t.querySelector(".al-modal-close")?.addEventListener("click",e),t.querySelector("#al-cancel-goal")?.addEventListener("click",e),t.querySelector("#al-goal-form")?.addEventListener("submit",async a=>{a.preventDefault();let s=t.querySelector("#al-goal-title").value.trim(),i=Number(t.querySelector("#al-goal-level").value),n=t.querySelector("#al-goal-due").value||null;if(!s){new r.Notice("\u8BF7\u8F93\u5165\u76EE\u6807\u540D\u79F0");return}try{await this.plugin.getGoalManager().createGoal({title:s,level:i,due:n}),new r.Notice("\u76EE\u6807\u521B\u5EFA\u6210\u529F\uFF01"),e(),this.loadAndRender()}catch(l){new r.Notice("\u521B\u5EFA\u5931\u8D25: "+l.message)}})}showCreateTaskModal(){let t=document.createElement("div");t.className="al-modal",t.innerHTML=`
      <div class="al-modal-bg"></div>
      <div class="al-modal-box">
        <div class="al-modal-header">
          <span>\u{1F4CB} \u521B\u5EFA\u4EFB\u52A1</span>
          <button class="al-modal-close">\xD7</button>
        </div>
        <form id="al-task-form">
          <div class="al-form-item">
            <label>\u4EFB\u52A1\u540D\u79F0</label>
            <input type="text" id="al-task-title" required placeholder="\u4F8B\u5982\uFF1A\u5B8C\u6210\u9879\u76EE\u62A5\u544A">
          </div>
          <div class="al-form-item">
            <label>\u4F18\u5148\u7EA7</label>
            <select id="al-task-priority">
              <option value="1">\u{1F534} \u6700\u9AD8</option>
              <option value="2">\u{1F7E0} \u9AD8</option>
              <option value="3" selected>\u{1F7E1} \u4E2D</option>
              <option value="4">\u{1F7E2} \u4F4E</option>
              <option value="5">\u26AA \u6700\u4F4E</option>
            </select>
          </div>
          <div class="al-form-item">
            <label>\u622A\u6B62\u65E5\u671F</label>
            <input type="date" id="al-task-due" value="${new Date().toISOString().split("T")[0]}">
          </div>
          <div class="al-form-actions">
            <button type="button" id="al-cancel-task">\u53D6\u6D88</button>
            <button type="submit" class="mod-cta">\u521B\u5EFA</button>
          </div>
        </form>
      </div>
    `,document.body.appendChild(t);let e=()=>t.remove();t.querySelector(".al-modal-bg")?.addEventListener("click",e),t.querySelector(".al-modal-close")?.addEventListener("click",e),t.querySelector("#al-cancel-task")?.addEventListener("click",e),t.querySelector("#al-task-form")?.addEventListener("submit",async a=>{a.preventDefault();let s=t.querySelector("#al-task-title").value.trim(),i=Number(t.querySelector("#al-task-priority").value),n=t.querySelector("#al-task-due").value||null;if(!s){new r.Notice("\u8BF7\u8F93\u5165\u4EFB\u52A1\u540D\u79F0");return}try{await this.plugin.getTaskManager().createTask({title:s,priority:i,due:n}),new r.Notice("\u4EFB\u52A1\u521B\u5EFA\u6210\u529F\uFF01"),e(),this.loadAndRender()}catch(l){new r.Notice("\u521B\u5EFA\u5931\u8D25: "+l.message)}})}async openTodayNote(){try{await this.plugin.getNoteManager().getOrCreateTodayNote(),new r.Notice("\u4ECA\u65E5\u65E5\u8BB0\u5DF2\u6253\u5F00")}catch{new r.Notice("\u6253\u5F00\u65E5\u8BB0\u5931\u8D25")}}async openWeeklyNote(){try{let t=this.plugin.getNoteManager().getCurrentWeekKey();await this.plugin.getNoteManager().getOrCreateWeeklyNote(t),new r.Notice("\u672C\u5468\u5468\u8BB0\u5DF2\u6253\u5F00")}catch{new r.Notice("\u6253\u5F00\u5468\u8BB0\u5931\u8D25")}}async openMonthlyNote(){try{let t=this.plugin.getNoteManager().getCurrentYearMonth();await this.plugin.getNoteManager().getOrCreateMonthlyNote(t),new r.Notice("\u672C\u6708\u6708\u8BB0\u5DF2\u6253\u5F00")}catch{new r.Notice("\u6253\u5F00\u6708\u8BB0\u5931\u8D25")}}removeStyles(){let t=document.getElementById("al-dashboard-styles");t&&t.remove()}addStyles(){this.removeStyles();let t=document.createElement("style");t.id="al-dashboard-styles",t.textContent=`
      .al-dashboard {
        padding: 0;
        min-height: 100vh;
      }
      
      .al-page {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .al-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
      }
      
      .al-header-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .al-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .al-date {
        font-size: 12px;
        color: var(--text-secondary);
      }
      
      .al-header-actions {
        display: flex;
        gap: 8px;
      }
      
      .al-header-actions button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      
      .al-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      
      .al-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16px;
        gap: 16px;
        overflow-y: auto;
      }
      
      .al-sidebar {
        width: 320px;
        padding: 16px;
        border-left: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
        flex-shrink: 0;
      }
      
      .al-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      
      .al-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        background: var(--background-secondary);
        border-radius: 10px;
        border: 1px solid var(--border-color);
      }
      
      .al-stat-warning {
        border-color: var(--text-red);
        background: color-mix(in srgb, var(--text-red) 5%, var(--background-secondary));
      }
      
      .al-stat-num {
        font-size: 32px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1;
      }
      
      .al-stat-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
      
      .al-panel {
        background: var(--background-secondary);
        border-radius: 10px;
        border: 1px solid var(--border-color);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .al-panel-overdue {
        border-color: var(--text-red);
        background: color-mix(in srgb, var(--text-red) 3%, var(--background-secondary));
      }
      
      .al-panel-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        background: var(--background-primary);
      }
      
      .al-panel-header span:first-child {
        font-size: 16px;
      }
      
      .al-panel-header span:nth-child(2) {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
      }
      
      .al-panel-count {
        margin-left: auto;
        font-size: 12px;
        padding: 2px 8px;
        background: var(--background-secondary);
        color: var(--text-secondary);
        border-radius: 10px;
      }
      
      .al-count-overdue {
        background: color-mix(in srgb, var(--text-red) 15%, transparent);
        color: var(--text-red);
      }
      
      .al-panel-body {
        padding: 8px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-height: 100px;
      }
      
      .al-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px;
        gap: 8px;
        color: var(--text-secondary);
      }
      
      .al-empty span {
        font-size: 40px;
        opacity: 0.5;
      }
      
      .al-empty-desc {
        font-size: 12px;
        color: var(--text-muted);
      }
      
      .al-goal {
        padding: 12px;
        background: var(--background-primary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
      }
      
      .al-goal-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      
      .al-goal-level {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--interactive-accent);
        color: white;
      }
      
      .al-goal-level[data-level="1"] { background: var(--text-purple); }
      .al-goal-level[data-level="2"] { background: var(--text-blue); }
      .al-goal-level[data-level="3"] { background: var(--interactive-accent); }
      .al-goal-level[data-level="4"] { background: var(--text-green); }
      
      .al-goal-status {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--text-green);
        color: white;
      }
      
      .al-goal-status.completed {
        background: var(--text-muted);
      }
      
      .al-goal-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 8px;
      }
      
      .al-goal-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .al-progress-bar {
        flex: 1;
        height: 6px;
        background: var(--background-modifier-border);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .al-progress-fill {
        height: 100%;
        background: var(--interactive-accent);
        border-radius: 3px;
        transition: width 0.3s;
      }
      
      .al-task {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        background: var(--background-primary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: background 0.15s;
      }
      
      .al-task:hover {
        background: var(--background-modifier-hover);
      }
      
      .al-task-check {
        width: 18px;
        height: 18px;
        border: 2px solid var(--border-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: white;
        flex-shrink: 0;
        margin-top: 1px;
      }
      
      .al-task-check.checked {
        background: var(--text-green);
        border-color: var(--text-green);
      }
      
      .al-task-content {
        flex: 1;
        min-width: 0;
      }
      
      .al-task-title {
        font-size: 13px;
        color: var(--text-primary);
        margin-bottom: 4px;
      }
      
      .al-task-title.done {
        text-decoration: line-through;
        color: var(--text-muted);
      }
      
      .al-task-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 11px;
        color: var(--text-secondary);
      }
      
      .al-task-due {
        color: var(--text-red);
      }
      
      .al-quick-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        width: 100%;
        text-align: left;
      }
      
      .al-quick-btn span:first-child {
        font-size: 18px;
      }
      
      .al-quick-btn span:last-child {
        font-size: 13px;
        color: var(--text-secondary);
      }
      
      .al-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .al-modal-bg {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }
      
      .al-modal-box {
        position: relative;
        background: var(--background-primary);
        border-radius: 12px;
        width: 90%;
        max-width: 420px;
        border: 1px solid var(--border-color);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }
      
      .al-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .al-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary);
        line-height: 1;
      }
      
      #al-goal-form, #al-task-form {
        padding: 20px;
      }
      
      .al-form-item {
        margin-bottom: 16px;
      }
      
      .al-form-item label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
      }
      
      .al-form-item input,
      .al-form-item select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 14px;
        background: var(--background-secondary);
        color: var(--text-primary);
        box-sizing: border-box;
      }
      
      .al-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
      }
      
      @media (max-width: 1100px) {
        .al-stats {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .al-sidebar {
          width: 300px;
        }
      }
      
      @media (max-width: 950px) {
        .al-stats {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .al-sidebar {
          width: 280px;
        }
      }
      
      @media (max-width: 800px) {
        .al-body {
          flex-direction: column;
        }
        
        .al-sidebar {
          width: 100%;
          border-left: none;
          border-top: 1px solid var(--border-color);
          padding: 16px;
        }
        
        .al-header-actions {
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .al-header-actions button {
          min-width: 80px;
        }
      }
      
      @media (max-width: 640px) {
        .al-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
        }
        
        .al-header-actions {
          width: 100%;
          justify-content: stretch;
        }
        
        .al-header-actions button {
          flex: 1;
          min-width: 0;
          justify-content: center;
          gap: 4px;
        }
        
        .al-header-actions button span:last-child {
          font-size: 11px;
        }
        
        .al-main {
          padding: 12px;
          gap: 12px;
        }
        
        .al-stats {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .al-stat {
          padding: 12px;
        }
        
        .al-stat-num {
          font-size: 24px;
        }
        
        .al-stat-label {
          font-size: 11px;
        }
        
        .al-panel-body {
          padding: 6px;
        }
        
        .al-task, .al-goal {
          padding: 10px;
        }
        
        .al-task-meta {
          flex-wrap: wrap;
          gap: 6px;
        }
      }
      
      @media (max-width: 480px) {
        .al-stats {
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        
        .al-stat {
          padding: 10px;
        }
        
        .al-stat-num {
          font-size: 20px;
        }
        
        .al-stat-label {
          font-size: 10px;
        }
        
        .al-title {
          font-size: 16px;
        }
        
        .al-date {
          font-size: 11px;
        }
        
        .al-header-actions button span:first-child {
          font-size: 14px;
        }
        
        .al-header-actions button span:last-child {
          font-size: 10px;
        }
        
        .al-panel-header {
          padding: 10px 12px;
        }
        
        .al-panel-header span:nth-child(2) {
          font-size: 13px;
        }
      }
    `,document.head.appendChild(t)}};var P=class extends m.Plugin{lifeSettings;storage;tagParser;goalManager;taskManager;noteManager;async onload(){console.log("Amazing Life loaded"),this.lifeSettings=Object.assign({},d,await this.loadData()),this.initializeComponents(),this.registerView(u,t=>new w(t,this)),this.addSettingTab(new b(this.app,this,this.lifeSettings,async t=>{this.lifeSettings=t,await this.saveData(this.lifeSettings),this.storage.updateSettings(this.lifeSettings),this.tagParser.updatePatterns(this.lifeSettings),this.goalManager.updateSettings(this.lifeSettings),this.taskManager.updateSettings(this.lifeSettings),this.noteManager.updateSettings(this.lifeSettings),new m.Notice("\u8BBE\u7F6E\u5DF2\u4FDD\u5B58")})),this.addRibbonIcon("target","Amazing Life",()=>{this.showDashboard()}),this.addCommand({id:"open-dashboard",name:"\u6253\u5F00\u4EEA\u8868\u76D8",callback:()=>this.showDashboard()}),this.addCommand({id:"create-goal",name:"\u521B\u5EFA\u76EE\u6807",callback:()=>this.showCreateGoalModal()}),this.addCommand({id:"create-task",name:"\u521B\u5EFA\u4EFB\u52A1",callback:()=>this.showCreateTaskModal()}),this.addCommand({id:"show-today-tasks",name:"\u4ECA\u65E5\u4EFB\u52A1",callback:()=>this.showTodayTasks()}),this.addCommand({id:"open-today-note",name:"\u6253\u5F00\u4ECA\u65E5\u65E5\u8BB0",callback:()=>this.openTodayNote()}),this.addStyles(),await this.storage.ensureDirectories(),await this.goalManager.loadGoals(),await this.taskManager.loadTasks()}onunload(){console.log("Amazing Life unloaded"),this.app.workspace.detachLeavesOfType(u)}initializeComponents(){this.storage=new x(this.app,this.lifeSettings),this.tagParser=new v(this.lifeSettings),this.goalManager=new A(this.storage,this.lifeSettings),this.taskManager=new k(this.storage,this.lifeSettings),this.noteManager=new T(this.storage,this.lifeSettings)}addStyles(){let t=document.createElement("style");t.id="amazing-life-base-styles",t.textContent=`
      .amazing-life-goal-card {
        padding: 12px;
        margin: 8px 0;
        background: var(--background-secondary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
      }
      
      .amazing-life-progress-bar {
        height: 8px;
        background: var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
        margin: 8px 0;
      }
      
      .amazing-life-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transition: width 0.3s ease;
      }
      
      .amazing-life-task-item {
        display: flex;
        align-items: center;
        padding: 8px;
        margin: 4px 0;
        background: var(--background-secondary);
        border-radius: 4px;
      }
      
      .amazing-life-priority-high { color: #ef4444; }
      .amazing-life-priority-medium { color: #f59e0b; }
      .amazing-life-priority-low { color: #22c55e; }
      
      .amazing-life-level-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        background: var(--interactive-accent);
        color: white;
      }
    `,document.head.appendChild(t)}async showDashboard(){let{workspace:t}=this.app,e=t.getLeavesOfType(u)[0];e||(e=t.getLeaf("split","vertical"),await e.setViewState({type:u,active:!0})),t.revealLeaf(e)}async showCreateGoalModal(){await this.showDashboard()}async showCreateTaskModal(){await this.showDashboard()}async showTodayTasks(){let t=this.taskManager.getTodayTasks(),e=this.taskManager.getOverdueTasks(),a=`\u4ECA\u65E5\u4EFB\u52A1: ${t.length} \u4E2A`;e.length>0&&(a+=` | \u903E\u671F: ${e.length} \u4E2A`),new m.Notice(a)}async openTodayNote(){let t=this.noteManager.getToday(),e=this.storage.getDailyNotePath(t),a=this.app.vault.getAbstractFileByPath(e);a?await this.app.workspace.getLeaf(!0).openFile(a):new m.Notice("\u4ECA\u65E5\u65E5\u8BB0\u4E0D\u5B58\u5728")}getGoalManager(){return this.goalManager}getTaskManager(){return this.taskManager}getNoteManager(){return this.noteManager}getTagParser(){return this.tagParser}getSettings(){return this.lifeSettings}};

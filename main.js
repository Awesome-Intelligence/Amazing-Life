"use strict";var S=Object.defineProperty;var z=Object.getOwnPropertyDescriptor;var O=Object.getOwnPropertyNames;var q=Object.prototype.hasOwnProperty;var B=(n,t)=>{for(var e in t)S(n,e,{get:t[e],enumerable:!0})},I=(n,t,e,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of O(t))!q.call(n,s)&&s!==e&&S(n,s,{get:()=>t[s],enumerable:!(a=z(t,s))||a.enumerable});return n};var W=n=>I(S({},"__esModule",{value:!0}),n);var R={};B(R,{default:()=>P});module.exports=W(R);var f=require("obsidian");var G={1:"\u4EBA\u751F\u76EE\u6807",2:"\u9636\u6BB5\u76EE\u6807",3:"\u5E74\u5EA6\u76EE\u6807",4:"\u77ED\u671F\u76EE\u6807"};var L={1:"\u6700\u9AD8",2:"\u9AD8",3:"\u4E2D",4:"\u4F4E",5:"\u6700\u4F4E"},d={dataPath:"Amazing Life",dailyPath:"Daily",weeklyPath:"Weekly",monthlyPath:"Monthly",yearlyPath:"Yearly",phasePath:"Phases",goalTagPrefix:"\u76EE\u6807",taskTagPrefix:"\u4EFB\u52A1",noteworthyTag:"noteworthy",autoProgressUpdate:!0};var v=class{goalTagPattern;taskTagPattern;noteworthyPattern;taskCheckboxPattern;constructor(t){this.updatePatterns(t)}updatePatterns(t){this.goalTagPattern=new RegExp(`#${t.goalTagPrefix}/([^\\s#]+)`,"g"),this.taskTagPattern=new RegExp(`#${t.taskTagPrefix}/([^\\s#]+)`,"g"),this.noteworthyPattern=new RegExp(`#${t.noteworthyTag}`,"gi"),this.taskCheckboxPattern=/^- \[([ x>])\]/}parseLines(t){return t.split(`
`).map((a,s)=>this.parseLine(a,s+1))}parseLine(t,e){let a=this.extractGoalTags(t),s=this.extractTaskTags(t),r=this.noteworthyPattern.test(t),i=this.taskCheckboxPattern.test(t),g;if(i){let h=t.match(this.taskCheckboxPattern);if(h){let c=h[1];c==="x"?g="completed":c===">"?g="in-progress":g="pending"}}let $=(t.match(/#[\w/]+/g)||[]).filter(h=>{let c=h.slice(1);return!c.startsWith("\u76EE\u6807/")&&!c.startsWith("\u4EFB\u52A1/")&&c.toLowerCase()!=="noteworthy"}).map(h=>h.slice(1));return{lineNumber:e,content:t,isTask:i,taskStatus:g,goalTags:a,taskTags:s,isNoteworthy:r,categoryTags:$}}extractGoalTags(t){let e=t.match(this.goalTagPattern);return e?e.map(a=>a.slice(1)):[]}extractTaskTags(t){let e=t.match(this.taskTagPattern);return e?e.map(a=>a.slice(1)):[]}extractNoteworthyLines(t){return this.parseLines(t).filter(e=>e.isNoteworthy)}extractTaskLines(t){return this.parseLines(t).filter(e=>e.isTask)}containsGoalTag(t,e){return this.extractGoalTags(t).some(s=>s.toLowerCase()===e.toLowerCase())}containsTaskTag(t,e){return this.extractTaskTags(t).some(s=>s.toLowerCase()===e.toLowerCase())}};var p=require("obsidian"),k=class{app;settings;constructor(t,e){this.app=t,this.settings=e}updateSettings(t){this.settings=t}getDataPath(){return this.settings.dataPath}getGoalsPath(){return`${this.settings.dataPath}/goals`}getTasksPath(){return`${this.settings.dataPath}/tasks`}async ensureDirectory(t){this.app.vault.getAbstractFileByPath(t)||await this.app.vault.createFolder(t)}async ensureDirectories(){await this.ensureDirectory(this.settings.dataPath),await this.ensureDirectory(this.getGoalsPath()),await this.ensureDirectory(this.getTasksPath()),await this.ensureDirectory(this.settings.dailyPath),await this.ensureDirectory(this.settings.weeklyPath),await this.ensureDirectory(this.settings.monthlyPath),await this.ensureDirectory(this.settings.yearlyPath),await this.ensureDirectory(this.settings.phasePath)}async readFile(t){let e=this.app.vault.getAbstractFileByPath(t);return e instanceof p.TFile?await this.app.vault.read(e):null}async writeFile(t,e){let a=this.app.vault.getAbstractFileByPath(t);a instanceof p.TFile?await this.app.vault.modify(a,e):await this.app.vault.create(t,e)}async createFile(t,e){return await this.app.vault.create(t,e)}async deleteFile(t){let e=this.app.vault.getAbstractFileByPath(t);e instanceof p.TFile&&await this.app.vault.delete(e)}getFilesInFolder(t){if(!this.app.vault.getAbstractFileByPath(t))return[];let a=[];for(let s of this.app.vault.getAllLoadedFiles())s.path.startsWith(t+"/")&&s instanceof p.TFile&&a.push(s);return a}getFileCache(t){return this.app.metadataCache.getFileCache(t)}parseFrontmatter(t){let e=this.getFileCache(t);return e?.frontmatter?e.frontmatter:{}}generateId(t){let e=Date.now().toString(36),a=Math.random().toString(36).substring(2,6);return`${t}-${e}${a}`}getDailyNote(t){let e=`${this.settings.dailyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getWeeklyNote(t){let e=`${this.settings.weeklyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getMonthlyNote(t){let e=`${this.settings.monthlyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getYearlyNote(t){let e=`${this.settings.yearlyPath}/${t}.md`,a=this.app.vault.getAbstractFileByPath(e);return a instanceof p.TFile?a:null}getDailyNotePath(t){return`${this.settings.dailyPath}/${t}.md`}getGoalPath(t){return`${this.getGoalsPath()}/${t}.md`}getTaskPath(t){return`${this.getTasksPath()}/${t}.md`}};var b=class{constructor(t,e){this.storage=t;this.settings=e}goals=new Map;goalsByLevel=new Map;updateSettings(t){this.settings=t}async loadGoals(){this.goals.clear(),this.goalsByLevel.clear();let t=this.storage.getFilesInFolder(this.storage.getGoalsPath());for(let e of t){if(e.name==="_index.md")continue;let a=await this.storage.readFile(e.path);if(a){let s=this.parseGoalFromContent(e,a);s&&this.goals.set(s["A-id"],s)}}for(let[e,a]of this.goals){let s=this.goalsByLevel.get(a["A-level"])||[];s.push(a),this.goalsByLevel.set(a["A-level"],s)}}parseGoalFromContent(t,e){let a=this.storage.parseFrontmatter(t);return a["A-type"]!=="goal"?null:{"A-id":String(a["A-id"]||t.basename),"A-type":"goal","A-title":String(a["A-title"]||""),"A-level":Number(a["A-level"]),"A-parent":a["A-parent"]?String(a["A-parent"]):null,"A-status":a["A-status"]||"active","A-progress":Number(a["A-progress"]||0),"A-weight":Number(a["A-weight"]||1),"A-start":String(a["A-start"]||new Date().toISOString().split("T")[0]),"A-due":a["A-due"]?String(a["A-due"]):null,"A-created":String(a["A-created"]||""),"A-updated":String(a["A-updated"]||new Date().toISOString())}}async createGoal(t){let e=this.storage.generateId("goal"),a=new Date().toISOString().split("T")[0],s={"A-id":e,"A-type":"goal","A-title":t.title,"A-level":t.level,"A-parent":t.parent||null,"A-status":"active","A-progress":0,"A-weight":1,"A-start":a,"A-due":t.due||null,"A-created":a,"A-updated":a},r=this.generateGoalContent(s,t.description);await this.storage.writeFile(this.storage.getGoalPath(e),r),this.goals.set(e,s);let i=this.goalsByLevel.get(t.level)||[];return i.push(s),this.goalsByLevel.set(t.level,i),s}generateGoalContent(t,e){let a=["---",`A-id: ${t["A-id"]}`,`A-type: ${t["A-type"]}`,`A-title: ${t["A-title"]}`,`A-level: ${t["A-level"]}`,`A-parent: ${t["A-parent"]||""}`,`A-status: ${t["A-status"]}`,`A-progress: ${t["A-progress"]}`,`A-weight: ${t["A-weight"]}`,`A-start: ${t["A-start"]}`,`A-due: ${t["A-due"]||""}`,`A-created: ${t["A-created"]}`,`A-updated: ${t["A-updated"]}`,"---","",`# ${t["A-title"]}`,""];if(e&&a.push("## \u6982\u8FF0","",e,""),t["A-parent"]){let s=this.goals.get(t["A-parent"]);s&&a.push("## \u7236\u76EE\u6807","",`- [[${t["A-parent"]}|${s["A-title"]}]]`,"")}return a.push("## \u5173\u8054\u4EFB\u52A1","","## \u8FDB\u5EA6\u8BB0\u5F55",""),a.join(`
`)}async updateGoal(t,e){let a=this.goals.get(t);if(!a)return null;let s=new Date().toISOString().split("T")[0];e.title!==void 0&&(a["A-title"]=e.title),e.due!==void 0&&(a["A-due"]=e.due),e.status!==void 0&&(a["A-status"]=e.status),e.progress!==void 0&&(a["A-progress"]=e.progress),a["A-updated"]=s;let r=await this.storage.readFile(this.storage.getGoalPath(t));if(r){let i=this.updateGoalInContent(r,a);await this.storage.writeFile(this.storage.getGoalPath(t),i)}return a}updateGoalInContent(t,e){let a=t.split(`
`),s=[],r=!1;for(let i of a){if(i==="---"){r=!r,s.push(i);continue}r?i.startsWith("A-title:")?s.push(`A-title: ${e["A-title"]}`):i.startsWith("A-status:")?s.push(`A-status: ${e["A-status"]}`):i.startsWith("A-progress:")?s.push(`A-progress: ${e["A-progress"]}`):i.startsWith("A-due:")?s.push(`A-due: ${e["A-due"]||""}`):i.startsWith("A-updated:")?s.push(`A-updated: ${e["A-updated"]}`):s.push(i):i.startsWith("# ")?s.push(`# ${e["A-title"]}`):s.push(i)}return s.join(`
`)}async deleteGoal(t){let e=this.goals.get(t);if(!e)return;await this.storage.deleteFile(this.storage.getGoalPath(t)),this.goals.delete(t);let a=this.goalsByLevel.get(e["A-level"]);if(a){let s=a.findIndex(r=>r["A-id"]===t);s!==-1&&a.splice(s,1)}}getGoal(t){return this.goals.get(t)||null}getGoalsByLevel(t){return this.goalsByLevel.get(t)||[]}getAllGoals(){return Array.from(this.goals.values())}getGoalTree(){let t=[];for(let e of this.goals.values())(e["A-level"]===1||!e["A-parent"])&&t.push(this.buildGoalTree(e));return t}buildGoalTree(t){let e=[];for(let a of this.goals.values())a["A-parent"]===t["A-id"]&&e.push(this.buildGoalTree(a));return{goal:t,children:e,tasks:[],aggregatedProgress:this.calculateAggregatedProgress(t,e)}}calculateAggregatedProgress(t,e){if(e.length===0)return t["A-progress"];let a=t["A-weight"],s=t["A-progress"]*t["A-weight"];for(let r of e)a+=r.goal["A-weight"],s+=r.aggregatedProgress*r.goal["A-weight"];return Math.round(s/a)}async updateProgressFromTasks(t,e){let a=e.filter(i=>i["A-goal"]===t);if(a.length===0)return 0;let s=a.filter(i=>i["A-status"]==="completed").length,r=Math.round(s/a.length*100);return await this.updateGoal(t,{progress:r}),r}getDescendants(t){let e=[],a=s=>{for(let r of this.goals.values())r["A-parent"]===s&&(e.push(r),a(r["A-id"]))};return a(t),e}};var A=class{constructor(t,e){this.storage=t;this.settings=e}tasks=new Map;tasksByGoal=new Map;updateSettings(t){this.settings=t}async loadTasks(){this.tasks.clear(),this.tasksByGoal.clear();let t=this.storage.getFilesInFolder(this.storage.getTasksPath());for(let e of t){if(e.name==="_index.md")continue;let a=await this.storage.readFile(e.path);if(a){let s=this.parseTaskFromContent(e,a);if(s&&(this.tasks.set(s["A-id"],s),s["A-goal"])){let r=this.tasksByGoal.get(s["A-goal"])||[];r.push(s),this.tasksByGoal.set(s["A-goal"],r)}}}}parseTaskFromContent(t,e){let a=this.storage.parseFrontmatter(t);if(a["A-type"]!=="task")return null;let s=a["A-tags"],r=[];return Array.isArray(s)?r=s.map(String):typeof s=="string"&&(r=[s]),{"A-id":String(a["A-id"]||t.basename),"A-type":"task","A-title":String(a["A-title"]||""),"A-status":a["A-status"]||"pending","A-priority":Number(a["A-priority"]||3),"A-due":a["A-due"]?String(a["A-due"]):null,"A-goal":a["A-goal"]?String(a["A-goal"]):null,"A-tags":r,"A-source":a["A-source"]?String(a["A-source"]):null,"A-created":String(a["A-created"]||""),"A-completed":a["A-completed"]?String(a["A-completed"]):null}}async createTask(t){let e=this.storage.generateId("task"),a=new Date().toISOString().split("T")[0],s={"A-id":e,"A-type":"task","A-title":t.title,"A-status":"pending","A-priority":t.priority||3,"A-due":t.due||null,"A-goal":t.goal||null,"A-tags":t.tags||[],"A-source":t.source||null,"A-created":a,"A-completed":null},r=this.generateTaskContent(s);if(await this.storage.writeFile(this.storage.getTaskPath(e),r),this.tasks.set(e,s),s["A-goal"]){let i=this.tasksByGoal.get(s["A-goal"])||[];i.push(s),this.tasksByGoal.set(s["A-goal"],i)}return s}generateTaskContent(t){let e=["---",`A-id: ${t["A-id"]}`,`A-type: ${t["A-type"]}`,`A-title: ${t["A-title"]}`,`A-status: ${t["A-status"]}`,`A-priority: ${t["A-priority"]}`,`A-due: ${t["A-due"]||""}`,`A-goal: ${t["A-goal"]||""}`,"A-tags:",...t["A-tags"].map(a=>`  - ${a}`),`A-source: ${t["A-source"]||""}`,`A-created: ${t["A-created"]}`,`A-completed: ${t["A-completed"]||""}`,"---","",`# ${t["A-title"]}`,"","## \u72B6\u6001","",`- [ ] \u521B\u5EFA\u4E8E ${t["A-created"]}`];return t["A-due"]&&e.push(`- [ ] \u622A\u6B62 ${t["A-due"]}`),t["A-goal"]&&e.push("","## \u5173\u8054\u76EE\u6807",""),e.join(`
`)}async updateTask(t,e){let a=this.tasks.get(t);if(!a)return null;let s=new Date().toISOString().split("T")[0];if(e.title!==void 0&&(a["A-title"]=e.title),e.priority!==void 0&&(a["A-priority"]=e.priority),e.due!==void 0&&(a["A-due"]=e.due),e.tags!==void 0&&(a["A-tags"]=e.tags),e.status!==void 0){let i=a["A-status"]!==e.status;a["A-status"]=e.status,i&&(e.status==="completed"?a["A-completed"]=s:a["A-completed"]=null)}let r=await this.storage.readFile(this.storage.getTaskPath(t));if(r){let i=this.updateTaskInContent(r,a);await this.storage.writeFile(this.storage.getTaskPath(t),i)}return a}updateTaskInContent(t,e){let a=t.split(`
`),s=[],r=!1;for(let i of a){if(i==="---"){r=!r,s.push(i);continue}if(r)if(i.startsWith("A-title:"))s.push(`A-title: ${e["A-title"]}`);else if(i.startsWith("A-status:"))s.push(`A-status: ${e["A-status"]}`);else if(i.startsWith("A-priority:"))s.push(`A-priority: ${e["A-priority"]}`);else if(i.startsWith("A-due:"))s.push(`A-due: ${e["A-due"]||""}`);else if(i.startsWith("A-completed:"))s.push(`A-completed: ${e["A-completed"]||""}`);else if(i==="A-tags:"){if(s.push(i),e["A-tags"].length===0)s.push("  - ");else for(let u of e["A-tags"])s.push(`  - ${u}`);let g=a[a.indexOf(i)+1];for(;g&&g.startsWith("  - ");)a.splice(a.indexOf(g),1),g=a[a.indexOf(i)+1]}else s.push(i);else i.startsWith("# ")?s.push(`# ${e["A-title"]}`):s.push(i)}return s.join(`
`)}async deleteTask(t){let e=this.tasks.get(t);if(e&&(await this.storage.deleteFile(this.storage.getTaskPath(t)),this.tasks.delete(t),e["A-goal"])){let a=this.tasksByGoal.get(e["A-goal"]);if(a){let s=a.findIndex(r=>r["A-id"]===t);s!==-1&&a.splice(s,1)}}}getTask(t){return this.tasks.get(t)||null}getTasksByGoal(t){return this.tasksByGoal.get(t)||[]}getAllTasks(){return Array.from(this.tasks.values())}getTodayTasks(){let t=new Date().toISOString().split("T")[0];return this.getAllTasks().filter(e=>e["A-status"]!=="completed"&&e["A-status"]!=="cancelled"&&e["A-due"]===t)}getOverdueTasks(){let t=new Date().toISOString().split("T")[0];return this.getAllTasks().filter(e=>e["A-status"]!=="completed"&&e["A-status"]!=="cancelled"&&e["A-due"]!==null&&e["A-due"]<t)}getInProgressTasks(){return this.getAllTasks().filter(t=>t["A-status"]==="in-progress")}getPendingTasks(){return this.getAllTasks().filter(t=>t["A-status"]==="pending")}getCompletedTasks(){return this.getAllTasks().filter(t=>t["A-status"]==="completed")}async completeTask(t){return this.updateTask(t,{status:"completed"})}async cancelTask(t){return this.updateTask(t,{status:"cancelled"})}async startTask(t){return this.updateTask(t,{status:"in-progress"})}};var T=class{constructor(t,e){this.storage=t;this.settings=e}updateSettings(t){this.settings=t}getToday(){return new Date().toISOString().split("T")[0]}getCurrentWeekKey(){let t=new Date,e=new Date(t.getFullYear(),0,1),a=Math.floor((t.getTime()-e.getTime())/(24*60*60*1e3)),s=Math.ceil((a+e.getDay()+1)/7);return`${t.getFullYear()}-W${s.toString().padStart(2,"0")}`}getCurrentYearMonth(){let t=new Date;return`${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,"0")}`}getCurrentYear(){return new Date().getFullYear().toString()}async getDailyNote(t){return this.storage.getDailyNote(t)}async getDailyNoteContent(t){return this.storage.readFile(this.storage.getDailyNotePath(t))}async getOrCreateTodayNote(){let t=this.getToday(),e=await this.getDailyNoteContent(t);if(e!==null)return e;let a=this.generateDailyNoteTemplate(t);return await this.storage.createFile(this.storage.getDailyNotePath(t),a),a}generateDailyNoteTemplate(t){let e=new Date(t),a=["\u5468\u65E5","\u5468\u4E00","\u5468\u4E8C","\u5468\u4E09","\u5468\u56DB","\u5468\u4E94","\u5468\u516D"][e.getDay()];return`---
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

`}};var o=require("obsidian");var x=class extends o.PluginSettingTab{settings;onSettingsChange;constructor(t,e,a,s){super(t,e),this.settings=a,this.onSettingsChange=s}display(){let{containerEl:t}=this;t.empty(),t.createEl("h2",{text:"Amazing Life \u8BBE\u7F6E"}),t.createEl("h3",{text:"\u76EE\u5F55\u8BBE\u7F6E"}),new o.Setting(t).setName("\u63D2\u4EF6\u6570\u636E\u76EE\u5F55").setDesc("\u5B58\u50A8\u76EE\u6807\u548C\u4EFB\u52A1\u6570\u636E").addText(e=>{e.setValue(this.settings.dataPath),e.onChange(a=>{this.settings.dataPath=a||d.dataPath,this.onSettingsChange(this.settings)})}),new o.Setting(t).setName("\u65E5\u8BB0\u76EE\u5F55").setDesc("\u6BCF\u65E5\u65E5\u8BB0\u5B58\u653E\u4F4D\u7F6E").addText(e=>{e.setValue(this.settings.dailyPath),e.onChange(a=>{this.settings.dailyPath=a||d.dailyPath,this.onSettingsChange(this.settings)})}),new o.Setting(t).setName("\u5468\u8BB0\u76EE\u5F55").addText(e=>{e.setValue(this.settings.weeklyPath),e.onChange(a=>{this.settings.weeklyPath=a||d.weeklyPath,this.onSettingsChange(this.settings)})}),new o.Setting(t).setName("\u6708\u8BB0\u76EE\u5F55").addText(e=>{e.setValue(this.settings.monthlyPath),e.onChange(a=>{this.settings.monthlyPath=a||d.monthlyPath,this.onSettingsChange(this.settings)})}),new o.Setting(t).setName("\u5E74\u8BB0\u76EE\u5F55").addText(e=>{e.setValue(this.settings.yearlyPath),e.onChange(a=>{this.settings.yearlyPath=a||d.yearlyPath,this.onSettingsChange(this.settings)})}),new o.Setting(t).setName("\u9636\u6BB5\u6027\u8BB0\u5F55\u76EE\u5F55").setDesc("\u5B63\u5EA6/\u9636\u6BB5\u590D\u76D8\u5B58\u653E\u4F4D\u7F6E").addText(e=>{e.setValue(this.settings.phasePath),e.onChange(a=>{this.settings.phasePath=a||d.phasePath,this.onSettingsChange(this.settings)})}),t.createEl("h3",{text:"\u6807\u7B7E\u8BBE\u7F6E"}),new o.Setting(t).setName("\u76EE\u6807\u6807\u7B7E\u524D\u7F00").setDesc("\u7528\u4E8E #\u76EE\u6807/xxx \u6807\u7B7E").addText(e=>{e.setValue(this.settings.goalTagPrefix),e.onChange(a=>{this.settings.goalTagPrefix=a||d.goalTagPrefix,this.onSettingsChange(this.settings)})}),new o.Setting(t).setName("\u4EFB\u52A1\u6807\u7B7E\u524D\u7F00").setDesc("\u7528\u4E8E #\u4EFB\u52A1/xxx \u6807\u7B7E").addText(e=>{e.setValue(this.settings.taskTagPrefix),e.onChange(a=>{this.settings.taskTagPrefix=a||d.taskTagPrefix,this.onSettingsChange(this.settings)})}),new o.Setting(t).setName("\u91CD\u8981\u6807\u8BB0").setDesc("\u7528\u4E8E #noteworthy \u6807\u7B7E").addText(e=>{e.setValue(this.settings.noteworthyTag),e.onChange(a=>{this.settings.noteworthyTag=a||d.noteworthyTag,this.onSettingsChange(this.settings)})}),t.createEl("h3",{text:"\u5176\u4ED6\u8BBE\u7F6E"}),new o.Setting(t).setName("\u81EA\u52A8\u66F4\u65B0\u8FDB\u5EA6").setDesc("\u5B8C\u6210\u4EFB\u52A1\u65F6\u81EA\u52A8\u66F4\u65B0\u76EE\u6807\u8FDB\u5EA6").addToggle(e=>{e.setValue(this.settings.autoProgressUpdate),e.onChange(a=>{this.settings.autoProgressUpdate=a,this.onSettingsChange(this.settings)})})}};var l=require("obsidian");var m="amazing-life-dashboard",w=class extends l.ItemView{plugin;constructor(t,e){super(t),this.plugin=e}getViewType(){return m}getDisplayText(){return"Amazing Life \u4EEA\u8868\u76D8"}async onOpen(){await this.render()}async onClose(){}async render(){let t=this.containerEl;t.empty();let e=t.createDiv("dashboard-header");e.innerHTML=`
      <div class="dashboard-title">
        <h1>\u{1F31F} Amazing Life</h1>
        <p class="dashboard-subtitle">\u751F\u6D3B\u7BA1\u7406\u7CFB\u7EDF</p>
      </div>
      <div class="dashboard-actions">
        <button class="dashboard-btn primary" id="create-goal-btn">+ \u521B\u5EFA\u76EE\u6807</button>
        <button class="dashboard-btn" id="create-task-btn">+ \u521B\u5EFA\u4EFB\u52A1</button>
      </div>
    `;let a=t.createDiv("dashboard-stats"),s=this.plugin.getGoalManager().getGoalTree(),r=this.plugin.getGoalManager().getAllGoals(),i=this.plugin.getTaskManager().getAllTasks(),g=this.plugin.getTaskManager().getTodayTasks(),u=this.plugin.getTaskManager().getOverdueTasks(),h=this.plugin.getTaskManager().getCompletedTasks().filter(y=>{if(!y["A-completed"])return!1;let D=new Date(y["A-completed"]),E=new Date,N=new Date(E.getTime()-7*24*60*60*1e3);return D>=N}).length;a.innerHTML=`
      <div class="stat-card">
        <div class="stat-value">${r.length}</div>
        <div class="stat-label">\u76EE\u6807\u603B\u6570</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${i.length}</div>
        <div class="stat-label">\u4EFB\u52A1\u603B\u6570</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-value">${g.length}</div>
        <div class="stat-label">\u4ECA\u65E5\u4EFB\u52A1</div>
      </div>
      <div class="stat-card ${u.length>0?"warning":""}">
        <div class="stat-value">${u.length}</div>
        <div class="stat-label">\u903E\u671F\u4EFB\u52A1</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${h}</div>
        <div class="stat-label">\u672C\u5468\u5B8C\u6210</div>
      </div>
    `;let c=t.createDiv("dashboard-main"),M=c.createDiv("dashboard-goals");M.innerHTML=`
      <div class="section-header">
        <h2>\u{1F3AF} \u76EE\u6807\u6982\u89C8</h2>
        <button class="dashboard-btn small" id="view-all-goals">\u67E5\u770B\u5168\u90E8</button>
      </div>
      <div class="goals-list" id="goals-list">
        ${this.renderGoalsList(s)}
      </div>
    `;let C=c.createDiv("dashboard-tasks");if(C.innerHTML=`
      <div class="section-header">
        <h2>\u{1F4CB} \u4ECA\u65E5\u4EFB\u52A1</h2>
        <button class="dashboard-btn small" id="view-all-tasks">\u67E5\u770B\u5168\u90E8</button>
      </div>
      <div class="tasks-list" id="tasks-list">
        ${this.renderTasksList(g)}
      </div>
    `,u.length>0){let y=t.createDiv("dashboard-overdue");y.innerHTML=`
        <div class="section-header warning">
          <h2>\u26A0\uFE0F \u903E\u671F\u4EFB\u52A1</h2>
        </div>
        <div class="tasks-list">
          ${this.renderTasksList(u,!0)}
        </div>
      `}let F=t.createDiv("dashboard-quick-actions");F.innerHTML=`
      <div class="section-header">
        <h2>\u26A1 \u5FEB\u6377\u64CD\u4F5C</h2>
      </div>
      <div class="quick-actions-grid">
        <button class="quick-action-btn" id="open-today-note">
          <span class="quick-action-icon">\u{1F4DD}</span>
          <span>\u4ECA\u65E5\u65E5\u8BB0</span>
        </button>
        <button class="quick-action-btn" id="open-weekly-note">
          <span class="quick-action-icon">\u{1F4C5}</span>
          <span>\u672C\u5468\u5468\u8BB0</span>
        </button>
        <button class="quick-action-btn" id="open-monthly-note">
          <span class="quick-action-icon">\u{1F4C6}</span>
          <span>\u672C\u6708\u6708\u8BB0</span>
        </button>
        <button class="quick-action-btn" id="refresh-dashboard">
          <span class="quick-action-icon">\u{1F504}</span>
          <span>\u5237\u65B0\u6570\u636E</span>
        </button>
      </div>
    `,this.bindEvents(),this.addStyles()}renderGoalsList(t){return t.length===0?'<div class="empty-state">\u6682\u65E0\u76EE\u6807\uFF0C\u521B\u5EFA\u4E00\u4E2A\u5F00\u59CB\u5427\uFF01</div>':t.slice(0,5).map(e=>{let a=e.goal,s=G[a["A-level"]];return`
        <div class="goal-card" data-goal-id="${a["A-id"]}">
          <div class="goal-header">
            <span class="goal-level-badge level-${a["A-level"]}">${s}</span>
            <span class="goal-status ${a["A-status"]}">${a["A-status"]==="active"?"\u8FDB\u884C\u4E2D":a["A-status"]}</span>
          </div>
          <h3 class="goal-title">${a["A-title"]}</h3>
          <div class="goal-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${a["A-progress"]}%"></div>
            </div>
            <span class="progress-text">${a["A-progress"]}%</span>
          </div>
          ${e.children.length>0?`<div class="goal-children">\u5B50\u76EE\u6807: ${e.children.length}</div>`:""}
        </div>
      `}).join("")}renderTasksList(t,e=!1){return t.length===0?'<div class="empty-state">\u6682\u65E0\u4EFB\u52A1</div>':t.slice(0,8).map(a=>{let s=a["A-priority"]<=2?"high":a["A-priority"]<=3?"medium":"low",r=L[a["A-priority"]];return`
        <div class="task-item ${e?"overdue":""}" data-task-id="${a["A-id"]}">
          <div class="task-checkbox ${a["A-status"]==="completed"?"checked":""}">
            ${a["A-status"]==="completed"?"\u2713":""}
          </div>
          <div class="task-content">
            <span class="task-title ${a["A-status"]==="completed"?"completed":""}">${a["A-title"]}</span>
            <div class="task-meta">
              <span class="task-priority priority-${s}">${r}</span>
              ${a["A-due"]?`<span class="task-due">${a["A-due"]}</span>`:""}
            </div>
          </div>
        </div>
      `}).join("")}bindEvents(){this.containerEl.querySelector("#create-goal-btn")?.addEventListener("click",()=>{this.showCreateGoalModal()}),this.containerEl.querySelector("#create-task-btn")?.addEventListener("click",()=>{this.showCreateTaskModal()}),this.containerEl.querySelector("#open-today-note")?.addEventListener("click",()=>{this.openTodayNote()}),this.containerEl.querySelector("#open-weekly-note")?.addEventListener("click",()=>{this.openWeeklyNote()}),this.containerEl.querySelector("#open-monthly-note")?.addEventListener("click",()=>{this.openMonthlyNote()}),this.containerEl.querySelector("#refresh-dashboard")?.addEventListener("click",()=>{this.refresh()}),this.containerEl.querySelectorAll(".task-checkbox").forEach(a=>{a.addEventListener("click",async s=>{let i=s.target.closest(".task-item")?.getAttribute("data-task-id");i&&await this.toggleTaskStatus(i)})})}async showCreateGoalModal(){let t=this.containerEl.createDiv("create-modal");t.innerHTML=`
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>\u521B\u5EFA\u76EE\u6807</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="create-goal-form">
          <div class="form-group">
            <label for="goal-title">\u76EE\u6807\u540D\u79F0</label>
            <input type="text" id="goal-title" required placeholder="\u8F93\u5165\u76EE\u6807\u540D\u79F0...">
          </div>
          <div class="form-group">
            <label for="goal-level">\u76EE\u6807\u5C42\u7EA7</label>
            <select id="goal-level">
              <option value="1">\u{1F3AF} \u4EBA\u751F\u76EE\u6807</option>
              <option value="2">\u{1F3AF} \u9636\u6BB5\u76EE\u6807</option>
              <option value="3" selected>\u{1F3AF} \u5E74\u5EA6\u76EE\u6807</option>
              <option value="4">\u{1F3AF} \u77ED\u671F\u76EE\u6807</option>
            </select>
          </div>
          <div class="form-group">
            <label for="goal-parent">\u7236\u76EE\u6807\uFF08\u53EF\u9009\uFF09</label>
            <select id="goal-parent">
              <option value="">-- \u65E0 --</option>
              ${this.plugin.getGoalManager().getAllGoals().map(e=>`<option value="${e["A-id"]}">${e["A-title"]}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label for="goal-due">\u622A\u6B62\u65E5\u671F\uFF08\u53EF\u9009\uFF09</label>
            <input type="date" id="goal-due">
          </div>
          <div class="form-actions">
            <button type="button" class="dashboard-btn" id="cancel-goal">\u53D6\u6D88</button>
            <button type="submit" class="dashboard-btn primary">\u521B\u5EFA</button>
          </div>
        </form>
      </div>
    `,t.querySelector(".modal-backdrop")?.addEventListener("click",()=>t.remove()),t.querySelector(".modal-close")?.addEventListener("click",()=>t.remove()),t.querySelector("#cancel-goal")?.addEventListener("click",()=>t.remove()),t.querySelector("#create-goal-form")?.addEventListener("submit",async e=>{e.preventDefault();let a=t.querySelector("#goal-title").value,s=Number(t.querySelector("#goal-level").value),r=t.querySelector("#goal-parent").value||null,i=t.querySelector("#goal-due").value||null;await this.plugin.getGoalManager().createGoal({title:a,level:s,parent:r,due:i}),new l.Notice("\u76EE\u6807\u521B\u5EFA\u6210\u529F\uFF01"),t.remove(),await this.render()})}async showCreateTaskModal(){let t=this.containerEl.createDiv("create-modal");t.innerHTML=`
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>\u521B\u5EFA\u4EFB\u52A1</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="create-task-form">
          <div class="form-group">
            <label for="task-title">\u4EFB\u52A1\u540D\u79F0</label>
            <input type="text" id="task-title" required placeholder="\u8F93\u5165\u4EFB\u52A1\u540D\u79F0...">
          </div>
          <div class="form-group">
            <label for="task-goal">\u5173\u8054\u76EE\u6807\uFF08\u53EF\u9009\uFF09</label>
            <select id="task-goal">
              <option value="">-- \u65E0 --</option>
              ${this.plugin.getGoalManager().getAllGoals().map(e=>`<option value="${e["A-id"]}">${e["A-title"]}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label for="task-priority">\u4F18\u5148\u7EA7</label>
            <select id="task-priority">
              <option value="1">\u{1F534} \u6700\u9AD8</option>
              <option value="2">\u{1F7E0} \u9AD8</option>
              <option value="3" selected>\u{1F7E1} \u4E2D</option>
              <option value="4">\u{1F7E2} \u4F4E</option>
              <option value="5">\u26AA \u6700\u4F4E</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-due">\u622A\u6B62\u65E5\u671F\uFF08\u53EF\u9009\uFF09</label>
            <input type="date" id="task-due">
          </div>
          <div class="form-actions">
            <button type="button" class="dashboard-btn" id="cancel-task">\u53D6\u6D88</button>
            <button type="submit" class="dashboard-btn primary">\u521B\u5EFA</button>
          </div>
        </form>
      </div>
    `,t.querySelector(".modal-backdrop")?.addEventListener("click",()=>t.remove()),t.querySelector(".modal-close")?.addEventListener("click",()=>t.remove()),t.querySelector("#cancel-task")?.addEventListener("click",()=>t.remove()),t.querySelector("#create-task-form")?.addEventListener("submit",async e=>{e.preventDefault();let a=t.querySelector("#task-title").value,s=t.querySelector("#task-goal").value||null,r=Number(t.querySelector("#task-priority").value),i=t.querySelector("#task-due").value||null;await this.plugin.getTaskManager().createTask({title:a,goal:s,priority:r,due:i}),new l.Notice("\u4EFB\u52A1\u521B\u5EFA\u6210\u529F\uFF01"),t.remove(),await this.render()})}async toggleTaskStatus(t){let e=this.plugin.getTaskManager().getTask(t);e&&(e["A-status"]==="completed"?await this.plugin.getTaskManager().updateTask(t,{status:"pending"}):await this.plugin.getTaskManager().completeTask(t),await this.render())}async openTodayNote(){let t=this.plugin.getNoteManager().getToday(),e=this.plugin.getSettings().dailyPath+"/"+t+".md",a=this.app.vault.getAbstractFileByPath(e);a&&a instanceof l.TFile?await this.app.workspace.getLeaf(!0).openFile(a):new l.Notice("\u4ECA\u65E5\u65E5\u8BB0\u4E0D\u5B58\u5728")}async openWeeklyNote(){let t=this.plugin.getNoteManager().getCurrentWeekKey(),e=this.plugin.getSettings().weeklyPath+"/"+t+".md",a=this.app.vault.getAbstractFileByPath(e);a&&a instanceof l.TFile?await this.app.workspace.getLeaf(!0).openFile(a):new l.Notice("\u5468\u8BB0\u4E0D\u5B58\u5728")}async openMonthlyNote(){let t=this.plugin.getNoteManager().getCurrentYearMonth(),e=this.plugin.getSettings().monthlyPath+"/"+t+".md",a=this.app.vault.getAbstractFileByPath(e);a&&a instanceof l.TFile?await this.app.workspace.getLeaf(!0).openFile(a):new l.Notice("\u6708\u8BB0\u4E0D\u5B58\u5728")}async refresh(){await this.plugin.getGoalManager().loadGoals(),await this.plugin.getTaskManager().loadTasks(),await this.render(),new l.Notice("\u6570\u636E\u5DF2\u5237\u65B0")}addStyles(){if(document.getElementById("amazing-life-dashboard-styles"))return;let t=document.createElement("style");t.id="amazing-life-dashboard-styles",t.textContent=`
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border-color);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px 8px 0 0;
        margin: -12px -12px 12px -12px;
      }
      
      .dashboard-title h1 {
        margin: 0;
        font-size: 24px;
      }
      
      .dashboard-subtitle {
        margin: 4px 0 0;
        opacity: 0.9;
        font-size: 14px;
      }
      
      .dashboard-actions {
        display: flex;
        gap: 8px;
      }
      
      .dashboard-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        background: rgba(255,255,255,0.2);
        color: white;
      }
      
      .dashboard-btn:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .dashboard-btn.primary {
        background: white;
        color: #667eea;
      }
      
      .dashboard-btn.primary:hover {
        background: #f0f0f0;
      }
      
      .dashboard-btn.small {
        padding: 4px 12px;
        font-size: 12px;
      }
      
      .dashboard-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .stat-card {
        background: var(--background-secondary);
        padding: 16px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid var(--border-color);
      }
      
      .stat-card.warning {
        border-color: #ef4444;
        background: #fef2f2;
      }
      
      .stat-card.success {
        border-color: #22c55e;
        background: #f0fdf4;
      }
      
      .stat-card.highlight {
        border-color: #667eea;
        background: #eef2ff;
      }
      
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: var(--text-primary);
      }
      
      .stat-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
      
      .dashboard-main {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      @media (max-width: 800px) {
        .dashboard-main {
          grid-template-columns: 1fr;
        }
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      
      .section-header h2 {
        margin: 0;
        font-size: 18px;
      }
      
      .section-header.warning h2 {
        color: #ef4444;
      }
      
      .goals-list, .tasks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .goal-card {
        background: var(--background-secondary);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .goal-card:hover {
        border-color: #667eea;
        transform: translateY(-2px);
      }
      
      .goal-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .goal-level-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        background: var(--interactive-accent);
        color: white;
      }
      
      .goal-level-badge.level-1 { background: #8b5cf6; }
      .goal-level-badge.level-2 { background: #7c3aed; }
      .goal-level-badge.level-3 { background: #6d28d9; }
      .goal-level-badge.level-4 { background: #5b21b6; }
      
      .goal-status {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        background: #22c55e;
        color: white;
      }
      
      .goal-status.completed {
        background: #6b7280;
      }
      
      .goal-title {
        margin: 0 0 8px;
        font-size: 14px;
      }
      
      .goal-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .progress-bar {
        flex: 1;
        height: 6px;
        background: var(--background-modifier-border);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        font-size: 12px;
        color: var(--text-secondary);
        min-width: 35px;
      }
      
      .goal-children {
        margin-top: 8px;
        font-size: 11px;
        color: var(--text-secondary);
      }
      
      .task-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--background-secondary);
        border-radius: 6px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .task-item:hover {
        border-color: #667eea;
      }
      
      .task-item.overdue {
        border-color: #ef4444;
        background: #fef2f2;
      }
      
      .task-checkbox {
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      
      .task-checkbox.checked {
        background: #22c55e;
        border-color: #22c55e;
      }
      
      .task-content {
        flex: 1;
        min-width: 0;
      }
      
      .task-title {
        display: block;
        font-size: 14px;
        margin-bottom: 4px;
      }
      
      .task-title.completed {
        text-decoration: line-through;
        color: var(--text-secondary);
      }
      
      .task-meta {
        display: flex;
        gap: 8px;
        font-size: 11px;
      }
      
      .task-priority {
        padding: 1px 6px;
        border-radius: 3px;
      }
      
      .priority-high {
        background: #fee2e2;
        color: #dc2626;
      }
      
      .priority-medium {
        background: #fef3c7;
        color: #d97706;
      }
      
      .priority-low {
        background: #dcfce7;
        color: #16a34a;
      }
      
      .task-due {
        color: var(--text-secondary);
      }
      
      .dashboard-overdue {
        background: #fef2f2;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #fecaca;
      }
      
      .dashboard-quick-actions {
        background: var(--background-secondary);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
      }
      
      .quick-actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      
      .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px;
        background: var(--background-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .quick-action-btn:hover {
        border-color: #667eea;
        transform: translateY(-2px);
      }
      
      .quick-action-icon {
        font-size: 24px;
      }
      
      .quick-action-btn span:last-child {
        font-size: 12px;
        color: var(--text-secondary);
      }
      
      .empty-state {
        text-align: center;
        padding: 24px;
        color: var(--text-secondary);
        background: var(--background-secondary);
        border-radius: 8px;
      }
      
      /* Modal Styles */
      .create-modal {
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
      
      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
      }
      
      .modal-content {
        position: relative;
        background: var(--background-primary);
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .modal-header h2 {
        margin: 0;
        font-size: 20px;
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary);
      }
      
      .modal-close:hover {
        color: var(--text-primary);
      }
      
      .modal-form .form-group {
        margin-bottom: 16px;
      }
      
      .modal-form label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
      }
      
      .modal-form input,
      .modal-form select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 14px;
        background: var(--background-primary);
        color: var(--text-primary);
      }
      
      .modal-form input:focus,
      .modal-form select:focus {
        outline: none;
        border-color: #667eea;
      }
      
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }
    `,document.head.appendChild(t)}};var P=class extends f.Plugin{lifeSettings;storage;tagParser;goalManager;taskManager;noteManager;async onload(){console.log("Amazing Life loaded"),this.lifeSettings=Object.assign({},d,await this.loadData()),this.initializeComponents(),this.registerView(m,t=>new w(t,this)),this.addSettingTab(new x(this.app,this,this.lifeSettings,async t=>{this.lifeSettings=t,await this.saveData(this.lifeSettings),this.storage.updateSettings(this.lifeSettings),this.tagParser.updatePatterns(this.lifeSettings),this.goalManager.updateSettings(this.lifeSettings),this.taskManager.updateSettings(this.lifeSettings),this.noteManager.updateSettings(this.lifeSettings),new f.Notice("\u8BBE\u7F6E\u5DF2\u4FDD\u5B58")})),this.addRibbonIcon("target","Amazing Life",()=>{this.showDashboard()}),this.addCommand({id:"open-dashboard",name:"\u6253\u5F00\u4EEA\u8868\u76D8",callback:()=>this.showDashboard()}),this.addCommand({id:"create-goal",name:"\u521B\u5EFA\u76EE\u6807",callback:()=>this.showCreateGoalModal()}),this.addCommand({id:"create-task",name:"\u521B\u5EFA\u4EFB\u52A1",callback:()=>this.showCreateTaskModal()}),this.addCommand({id:"show-today-tasks",name:"\u4ECA\u65E5\u4EFB\u52A1",callback:()=>this.showTodayTasks()}),this.addCommand({id:"open-today-note",name:"\u6253\u5F00\u4ECA\u65E5\u65E5\u8BB0",callback:()=>this.openTodayNote()}),this.addStyles(),await this.storage.ensureDirectories(),await this.goalManager.loadGoals(),await this.taskManager.loadTasks()}onunload(){console.log("Amazing Life unloaded"),this.app.workspace.detachLeavesOfType(m)}initializeComponents(){this.storage=new k(this.app,this.lifeSettings),this.tagParser=new v(this.lifeSettings),this.goalManager=new b(this.storage,this.lifeSettings),this.taskManager=new A(this.storage,this.lifeSettings),this.noteManager=new T(this.storage,this.lifeSettings)}addStyles(){let t=document.createElement("style");t.id="amazing-life-base-styles",t.textContent=`
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
    `,document.head.appendChild(t)}async showDashboard(){let{workspace:t}=this.app,e=t.getLeavesOfType(m)[0];e||(e=t.getLeaf("split","vertical"),await e.setViewState({type:m,active:!0})),t.revealLeaf(e)}async showCreateGoalModal(){await this.showDashboard()}async showCreateTaskModal(){await this.showDashboard()}async showTodayTasks(){let t=this.taskManager.getTodayTasks(),e=this.taskManager.getOverdueTasks(),a=`\u4ECA\u65E5\u4EFB\u52A1: ${t.length} \u4E2A`;e.length>0&&(a+=` | \u903E\u671F: ${e.length} \u4E2A`),new f.Notice(a)}async openTodayNote(){let t=this.noteManager.getToday(),e=this.storage.getDailyNotePath(t),a=this.app.vault.getAbstractFileByPath(e);a?await this.app.workspace.getLeaf(!0).openFile(a):new f.Notice("\u4ECA\u65E5\u65E5\u8BB0\u4E0D\u5B58\u5728")}getGoalManager(){return this.goalManager}getTaskManager(){return this.taskManager}getNoteManager(){return this.noteManager}getTagParser(){return this.tagParser}getSettings(){return this.lifeSettings}};

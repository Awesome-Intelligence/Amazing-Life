const fs = require('fs');
const path = 'E:/Awesome Intelligence/Amazing Life/src/storage/FileStorage.ts';
let c = fs.readFileSync(path, 'utf8');
const NL = String.fromCharCode(10);

const goalsPathLine = "  getGoalsPath(): string {";
const goalsPathReturn = "    return `${this.settings.dataPath}/goals`;";
if (!c.includes(goalsPathLine)) { console.log('goalsPathLine missing'); process.exit(1); }

const addContactPath = goalsPathLine + NL +
  "    return `${this.settings.dataPath}/goals`;" + NL +
  "  }" + NL + NL +
  "  /**" + NL +
  "   * 获取联系人目录" + NL +
  "   */" + NL +
  "  getContactsPath(): string {" + NL +
  "    return this.settings.contactPath || `${this.settings.dataPath}/contacts`;" + NL +
  "  }";

const goalsBlock = "  getGoalsPath(): string {" + NL +
  "    return `${this.settings.dataPath}/goals`;" + NL +
  "  }";

if (!c.includes(goalsBlock)) { console.log('goalsBlock not found'); process.exit(1); }
c = c.replace(goalsBlock, addContactPath);

const ensureAfter = "    await this.ensureDirectory(this.getTasksPath());";
if (!c.includes(ensureAfter)) { console.log('ensureAfter missing'); process.exit(1); }
c = c.replace(ensureAfter, ensureAfter + NL + "    await this.ensureDirectory(this.getContactsPath());");

const genIdOld = "  generateId(type: 'goal' | 'task'): string {";
const genIdNew = "  generateId(type: 'goal' | 'task' | 'contact'): string {";
if (!c.includes(genIdOld)) { console.log('genId missing'); process.exit(1); }
c = c.replace(genIdOld, genIdNew);

const taskPathOld = "  getTaskPath(id: string): string {" + NL + "    return `${this.getTasksPath()}/${id}.md`;" + NL + "  }";
if (!c.includes(taskPathOld)) { console.log('taskPath missing'); process.exit(1); }
const taskPathAdd = taskPathOld + NL + NL +
  "  /**" + NL +
  "   * 生成联系人文件路径（按 ID）" + NL +
  "   */" + NL +
  "  getContactPath(id: string): string {" + NL +
  "    return `${this.getContactsPath()}/${id}.md`;" + NL +
  "  }" + NL + NL +
  "  /**" + NL +
  "   * 根据联系人姓名生成文件路径" + NL +
  "   */" + NL +
  "  getContactPathByTitle(title: string): string {" + NL +
  "    const safeTitle = title.replace(/[\\\\/:*?\"<>|]/g, '_').substring(0, 100);" + NL +
  "    return `${this.getContactsPath()}/${safeTitle}.md`;" + NL +
  "  }" + NL + NL +
  "  /**" + NL +
  "   * 根据联系人姓名获取文件" + NL +
  "   */" + NL +
  "  getContactFileByTitle(title: string): TFile | null {" + NL +
  "    const path = this.getContactPathByTitle(title);" + NL +
  "    const file = this.app.vault.getAbstractFileByPath(path);" + NL +
  "    return file instanceof TFile ? file : null;" + NL +
  "  }" + NL + NL +
  "  /**" + NL +
  "   * 根据联系人 ID 获取文件" + NL +
  "   */" + NL +
  "  getContactFile(id: string): TFile | null {" + NL +
  "    const path = this.getContactPath(id);" + NL +
  "    const file = this.app.vault.getAbstractFileByPath(path);" + NL +
  "    return file instanceof TFile ? file : null;" + NL +
  "  }";
c = c.replace(taskPathOld, taskPathAdd);

const startAnchor = "  async getBacklinksForTask(taskId: string): Promise<Array<{";
const startIdx = c.indexOf(startAnchor);
if (startIdx < 0) { console.log('getBacklinksForTask missing'); process.exit(1); }
let depth = 0; let inString = false; let stringChar = ''; let endIdx = -1;
for (let i = startIdx; i < c.length; i++) {
  const ch = c[i];
  const prev = i > 0 ? c[i-1] : '';
  if (inString) {
    if (ch === stringChar && prev !== '\\') inString = false;
  } else {
    if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; }
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { endIdx = i + 1; break; } }
  }
}
if (endIdx < 0) { console.log('end of getBacklinksForTask not found'); process.exit(1); }

const contactBacklinks = NL + NL +
  "  /**" + NL +
  "   * 通过 #tagPrefix/姓名 标签扫描所有笔记，提取联系人互动记录" + NL +
  "   * 标签不是 wikilink，所以不能依赖 resolvedLinks" + NL +
  "   */" + NL +
  "  async getBacklinksForContact(contactName: string, tagPrefix: string): Promise<Array<{" + NL +
  "    file: TFile;" + NL +
  "    content: string;" + NL +
  "    lines: number[];" + NL +
  "  }>> {" + NL +
  "    const result: Array<{ file: TFile; content: string; lines: number[]; }> = [];" + NL +
  "    const escapedName = contactName.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');" + NL +
  "    const tagPattern = new RegExp('#' + tagPrefix + '\\\\/' + escapedName + '(?=[^\\\\w]|$)', 'g');" + NL +
  "" + NL +
  "    for (const file of this.app.vault.getMarkdownFiles()) {" + NL +
  "      const content = await this.app.vault.cachedRead(file);" + NL +
  "      const lines = content.split('\\\\n');" + NL +
  "      const matchedLines: number[] = [];" + NL +
  "      for (let i = 0; i < lines.length; i++) {" + NL +
  "        if (tagPattern.test(lines[i])) {" + NL +
  "          matchedLines.push(i);" + NL +
  "        }" + NL +
  "      }" + NL +
  "      if (matchedLines.length > 0) {" + NL +
  "        result.push({ file, content, lines: matchedLines });" + NL +
  "      }" + NL +
  "    }" + NL +
  "" + NL +
  "    return result;" + NL +
  "  }";

c = c.slice(0, endIdx) + contactBacklinks + c.slice(endIdx);

fs.writeFileSync(path, c, 'utf8');
console.log('OK - lines:', c.split(NL).length);
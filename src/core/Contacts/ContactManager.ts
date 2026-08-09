/**
 * Contact Manager
 * Manages contact CRUD operations, interaction tracking, and reminders
 */

import { TFile } from 'obsidian';
import { FileStorage } from '../../storage/FileStorage';
import { Contact, ContactInteraction, ContactPriority, ContactStatus, PluginSettings, CustomFieldConfig } from '../../types';

export interface CreateContactDTO {
  title: string;
  relation?: string;
  priority?: ContactPriority;
  status?: ContactStatus;
  nickname?: string;
  gender?: 'male' | 'female' | 'other' | '';
  birthday?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  tags?: string[];
  source?: string | null;
  met?: string | null;
  remindInterval?: number;
  goals?: string[];
  related?: string[];
  avatar?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  description?: string | null;
  [key: string]: any;
}

export interface UpdateContactDTO {
  title?: string;
  nickname?: string;
  relation?: string;
  priority?: ContactPriority;
  status?: ContactStatus;
  gender?: 'male' | 'female' | 'other' | '';
  birthday?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  tags?: string[];
  source?: string | null;
  met?: string | null;
  lastContact?: string | null;
  remindInterval?: number;
  goals?: string[];
  related?: string[];
  avatar?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  description?: string | null;
  [key: string]: any;
}

export interface ContactStats {
  total: number;
  active: number;
  archived: number;
  byRelation: Record<string, number>;
  byPriority: Record<number, number>;
  upcomingBirthdays: Contact[];
  needContact: Contact[];
}

export class ContactManager {
  private contacts: Map<string, Contact> = new Map();
  private contactsByRelation: Map<string, Contact[]> = new Map();
  private onSettingsChange: ((settings: PluginSettings) => void) | null = null;

  constructor(
    private storage: FileStorage,
    private settings: PluginSettings
  ) {}

  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }

  setOnSettingsChange(callback: (settings: PluginSettings) => void): void {
    this.onSettingsChange = callback;
  }

  /**
   * 加载所有联系人
   */
  async loadContacts(): Promise<void> {
    this.contacts.clear();
    this.contactsByRelation.clear();

    const files = this.storage.getFilesInFolder(this.storage.getContactsPath());

    for (const file of files) {
      if (file.name === '_index.md') continue;

      const content = await this.storage.readFile(file.path);
      if (content) {
        const contact = this.parseContactFromContent(file, content);
        if (contact) {
          this.contacts.set(contact['A-id'], contact);
          const relation = contact['A-relation'] || '其他';
          const list = this.contactsByRelation.get(relation) || [];
          list.push(contact);
          this.contactsByRelation.set(relation, list);
        }
      }
    }
  }

  /**
   * 从文件内容解析联系人
   */
  private parseContactFromContent(file: TFile, fileContent: string): Contact | null {
    const normalizedContent = fileContent.replace(/\r\n?/g, '\n');
    const frontmatter = this.parseFrontmatterFromContent(normalizedContent);
    if (frontmatter['A-type'] !== 'contact') return null;

    const tagsRaw = frontmatter['A-tags'];
    let parsedTags: string[] = [];
    if (Array.isArray(tagsRaw)) parsedTags = tagsRaw.map(String);
    else if (typeof tagsRaw === 'string' && tagsRaw) {
      try { parsedTags = JSON.parse(tagsRaw); } catch { parsedTags = [tagsRaw]; }
    }

    const arrFields = ['A-goals', 'A-related'];
    const arrays: Record<string, string[]> = {};
    for (const f of arrFields) {
      const v = frontmatter[f];
      if (Array.isArray(v)) arrays[f] = v.map(String);
      else if (typeof v === 'string' && v) {
        try { arrays[f] = JSON.parse(v); } catch { arrays[f] = [v]; }
      } else arrays[f] = [];
    }

    let description: string | null = null;
    const descMatch = normalizedContent.match(/## 备注\s*\n([\s\S]*?)(?=\n## |\n$)/);
    if (descMatch) description = descMatch[1].trim() || null;

    // 提取联系方式段
    const contactInfo: string[] = [];
    const infoMatch = normalizedContent.match(/## 联系方式\s*\n([\s\S]*?)(?=\n## |\n$)/);
    if (infoMatch) contactInfo.push(infoMatch[1].trim());

    const contact: Contact = {
      'A-id': String(frontmatter['A-id'] || file.basename),
      'A-type': 'contact',
      'A-title': String(frontmatter['A-title'] || ''),
      'A-nickname': String(frontmatter['A-nickname'] || ''),
      'A-relation': String(frontmatter['A-relation'] || '其他'),
      'A-priority': Number(frontmatter['A-priority'] || 3) as ContactPriority,
      'A-status': (frontmatter['A-status'] || 'active') as ContactStatus,
      'A-gender': (frontmatter['A-gender'] || '') as any,
      'A-birthday': frontmatter['A-birthday'] ? String(frontmatter['A-birthday']) : null,
      'A-company': frontmatter['A-company'] ? String(frontmatter['A-company']) : null,
      'A-job-title': frontmatter['A-job-title'] ? String(frontmatter['A-job-title']) : null,
      'A-tags': parsedTags,
      'A-source': frontmatter['A-source'] ? String(frontmatter['A-source']) : null,
      'A-met': frontmatter['A-met'] ? String(frontmatter['A-met']) : null,
      'A-last-contact': frontmatter['A-last-contact'] ? String(frontmatter['A-last-contact']) : null,
      'A-remind-interval': Number(frontmatter['A-remind-interval'] || this.settings.contactDefaultInterval || 90),
      'A-goals': arrays['A-goals'],
      'A-related': arrays['A-related'],
      'A-avatar': frontmatter['A-avatar'] ? String(frontmatter['A-avatar']) : null,
      'A-phone': frontmatter['A-phone'] ? String(frontmatter['A-phone']) : null,
      'A-email': frontmatter['A-email'] ? String(frontmatter['A-email']) : null,
      'A-wechat': frontmatter['A-wechat'] ? String(frontmatter['A-wechat']) : null,
      'A-description': description,
      'A-created': String(frontmatter['A-created'] || ''),
      'A-updated': String(frontmatter['A-updated'] || '')
    };

    // 保留自定义字段
    const systemKeys = new Set([
      'A-id', 'A-type', 'A-title', 'A-nickname', 'A-relation', 'A-priority', 'A-status',
      'A-gender', 'A-birthday', 'A-company', 'A-job-title', 'A-tags', 'A-source',
      'A-met', 'A-last-contact', 'A-remind-interval', 'A-goals', 'A-related',
      'A-avatar', 'A-phone', 'A-email', 'A-wechat', 'A-description', 'A-created', 'A-updated'
    ]);
    for (const key of Object.keys(frontmatter)) {
      if (systemKeys.has(key)) continue;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- 动态属性赋值，需要访问 any 类型的 contact 对象
      (contact as any)[key] = frontmatter[key];
    }

    return contact;
  }

  private parseFrontmatterFromContent(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const m = normalized.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return result;
    const lines = m[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const colon = trimmed.indexOf(':');
      if (colon === -1) continue;
      const key = trimmed.substring(0, colon).trim();
      let value: string = trimmed.substring(colon + 1).trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        try { result[key] = JSON.parse(value); continue; } catch {}
      }
      if (value === 'null') { result[key] = null; continue; }
      if (value === 'true') { result[key] = true; continue; }
      if (value === 'false') { result[key] = false; continue; }
      if (/^-?\d+$/.test(value)) { result[key] = Number(value); continue; }
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        result[key] = value.substring(1, value.length - 1);
        continue;
      }
      result[key] = value;
    }
    return result;
  }
  /**
   * 创建联系人
   */
  async createContact(dto: CreateContactDTO): Promise<Contact> {
    const id = this.storage.generateId('contact');
    const now = new Date().toISOString().split('T')[0];

    const contact: Contact = {
      'A-id': id,
      'A-type': 'contact',
      'A-title': dto.title,
      'A-nickname': dto.nickname || '',
      'A-relation': dto.relation || '其他',
      'A-priority': dto.priority || 3,
      'A-status': dto.status || 'active',
      'A-gender': dto.gender || '',
      'A-birthday': dto.birthday || null,
      'A-company': dto.company || null,
      'A-job-title': dto.jobTitle || null,
      'A-tags': dto.tags || [],
      'A-source': dto.source || null,
      'A-met': dto.met || null,
      'A-last-contact': null,
      'A-remind-interval': dto.remindInterval || this.settings.contactDefaultInterval || 90,
      'A-goals': dto.goals || [],
      'A-related': dto.related || [],
      'A-avatar': dto.avatar || null,
      'A-phone': dto.phone || null,
      'A-email': dto.email || null,
      'A-wechat': dto.wechat || null,
      'A-description': dto.description || null,
      'A-created': now,
      'A-updated': now
    };

    // 写入自定义字段
    for (const key of Object.keys(dto)) {
      if (key === 'title' || key === 'relation' || key === 'priority' || key === 'status' ||
          key === 'nickname' || key === 'gender' || key === 'birthday' || key === 'company' ||
          key === 'jobTitle' || key === 'tags' || key === 'source' || key === 'met' ||
          key === 'remindInterval' || key === 'goals' || key === 'related' ||
          key === 'avatar' || key === 'phone' || key === 'email' || key === 'wechat' ||
          key === 'description') continue;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- 动态属性赋值，需要访问 any 类型的 contact 和 dto 对象
      (contact as any)[key] = (dto as any)[key];
    }

    const content = this.buildContactContent(contact);
    await this.storage.ensureDirectory(this.storage.getContactsPath());
    const path = this.storage.getContactPathByTitle(contact['A-title']);
    await this.storage.createFile(path, content);

    this.contacts.set(contact['A-id'], contact);
    const list = this.contactsByRelation.get(contact['A-relation']) || [];
    list.push(contact);
    this.contactsByRelation.set(contact['A-relation'], list);

    return contact;
  }

  /**
   * 更新联系人
   */
  async updateContact(id: string, dto: UpdateContactDTO): Promise<Contact | null> {
    const contact = this.contacts.get(id);
    if (!contact) return null;

    const oldRelation = contact['A-relation'];

    for (const key of Object.keys(dto)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- 动态属性赋值，需要访问 any 类型的 contact 和 dto 对象
      (contact as any)[key] = (dto as any)[key];
    }
    contact['A-updated'] = new Date().toISOString().split('T')[0];

    const content = this.buildContactContent(contact);
    const oldPath = this.storage.getContactPathByTitle(contact['A-title']);

    // 重命名时可能需要迁移文件
    const oldFile = this.storage.getContactFile(id);
    const newPath = this.storage.getContactPathByTitle(contact['A-title']);
    if (oldFile && oldFile.path !== newPath) {
      // 删除旧文件，写新文件
      await this.storage.deleteFile(oldFile.path);
    }
    await this.storage.writeFile(newPath, content);

    // 如果 relation 变了，重建索引
    if (oldRelation !== contact['A-relation']) {
      const oldList = this.contactsByRelation.get(oldRelation) || [];
      const idx = oldList.findIndex(c => c['A-id'] === id);
      if (idx !== -1) oldList.splice(idx, 1);
      const newList = this.contactsByRelation.get(contact['A-relation']) || [];
      newList.push(contact);
      this.contactsByRelation.set(contact['A-relation'], newList);
    }

    return contact;
  }

  /**
   * 删除联系人
   */
  async deleteContact(id: string): Promise<void> {
    const contact = this.contacts.get(id);
    if (!contact) return;

    const file = this.storage.getContactFileByTitle(contact['A-title']);
    if (file) await this.storage.deleteFile(file.path);

    this.contacts.delete(id);
    const list = this.contactsByRelation.get(contact['A-relation']);
    if (list) {
      const idx = list.findIndex(c => c['A-id'] === id);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /**
   * 记录一次互动（更新最近联系）
   */
  async recordInteraction(id: string, date?: string): Promise<Contact | null> {
    const d = date || new Date().toISOString().split('T')[0];
    return await this.updateContact(id, { lastContact: d });
  }
  /**
   * 生成联系人 Markdown 内容
   */
  private buildContactContent(contact: Contact): string {
    const lines: string[] = [];
    lines.push('---');
    lines.push(`A-id: ${contact['A-id']}`);
    lines.push('A-type: contact');
    lines.push(`A-title: ${this.escapeYaml(contact['A-title'])}`);
    lines.push(`A-nickname: ${this.escapeYaml(contact['A-nickname'])}`);
    lines.push(`A-relation: ${this.escapeYaml(contact['A-relation'])}`);
    lines.push(`A-priority: ${contact['A-priority']}`);
    lines.push(`A-status: ${contact['A-status']}`);
    lines.push(`A-gender: ${contact['A-gender']}`);
    lines.push(`A-birthday: ${contact['A-birthday'] || 'null'}`);
    lines.push(`A-company: ${contact['A-company'] ? this.escapeYaml(contact['A-company']) : 'null'}`);
    lines.push(`A-job-title: ${contact['A-job-title'] ? this.escapeYaml(contact['A-job-title']) : 'null'}`);
    lines.push(`A-tags: ${JSON.stringify(contact['A-tags'])}`);
    lines.push(`A-source: ${contact['A-source'] ? this.escapeYaml(contact['A-source']) : 'null'}`);
    lines.push(`A-met: ${contact['A-met'] || 'null'}`);
    lines.push(`A-last-contact: ${contact['A-last-contact'] || 'null'}`);
    lines.push(`A-remind-interval: ${contact['A-remind-interval']}`);
    lines.push(`A-goals: ${JSON.stringify(contact['A-goals'])}`);
    lines.push(`A-related: ${JSON.stringify(contact['A-related'])}`);
    lines.push(`A-avatar: ${contact['A-avatar'] || 'null'}`);
    lines.push(`A-phone: ${contact['A-phone'] || 'null'}`);
    lines.push(`A-email: ${contact['A-email'] || 'null'}`);
    lines.push(`A-wechat: ${contact['A-wechat'] || 'null'}`);
    lines.push(`A-created: ${contact['A-created']}`);
    lines.push(`A-updated: ${contact['A-updated']}`);

    // 自定义字段
    const systemKeys = new Set([
      'A-id', 'A-type', 'A-title', 'A-nickname', 'A-relation', 'A-priority', 'A-status',
      'A-gender', 'A-birthday', 'A-company', 'A-job-title', 'A-tags', 'A-source',
      'A-met', 'A-last-contact', 'A-remind-interval', 'A-goals', 'A-related',
      'A-avatar', 'A-phone', 'A-email', 'A-wechat', 'A-description', 'A-created', 'A-updated'
    ]);
    for (const key of Object.keys(contact)) {
      if (systemKeys.has(key)) continue;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- 动态属性访问，需要访问 any 类型的 contact 对象
      const v = (contact as any)[key];
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v) || typeof v === 'object') {
        lines.push(`${key}: ${JSON.stringify(v)}`);
      } else if (typeof v === 'string') {
        lines.push(`${key}: ${this.escapeYaml(v)}`);
      } else {
        lines.push(`${key}: ${v}`);
      }
    }

    lines.push('---');
    lines.push('');
    lines.push(`# ${contact['A-title']}`);
    lines.push('');
    lines.push('## 联系方式');
    lines.push('');
    if (contact['A-phone']) { lines.push(`- 电话: ${contact['A-phone']}`); }
    if (contact['A-email']) { lines.push(`- 邮箱: ${contact['A-email']}`); }
    if (contact['A-wechat']) { lines.push(`- 微信: ${contact['A-wechat']}`); }
    if (contact['A-company']) { lines.push(`- 公司: ${contact['A-company']}`); }
    if (contact['A-job-title']) { lines.push(`- 职位: ${contact['A-job-title']}`); }
    if (!contact['A-phone'] && !contact['A-email'] && !contact['A-wechat'] && !contact['A-company'] && !contact['A-job-title']) {
      lines.push('*暂无*');
    }
    lines.push('');
    if (contact['A-description']) {
      lines.push('## 备注');
      lines.push('');
      lines.push(contact['A-description']);
      lines.push('');
    }
    lines.push('## 互动时间线');
    lines.push('');
    lines.push(`<!-- 通过 #${this.settings.contactTagPrefix}/${this.escapeYaml(contact['A-title'])} 标签自动汇总 -->`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*由 Amazing Life 管理*');

    return lines.join('\n');
  }

  private escapeYaml(s: string): string {
    if (s === null || s === undefined) return '';
    // 如果包含特殊字符，用引号包裹
    if (/[:#\n\r"'\[\]{}|>%@`]/.test(s) || /^[-\s]/.test(s)) {
      return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return s;
  }

  /**
   * 获取联系人
   */
  getContact(id: string): Contact | null {
    return this.contacts.get(id) || null;
  }

  /**
   * 通过姓名获取联系人（不区分大小写）
   */
  getContactByName(name: string): Contact | null {
    for (const c of this.contacts.values()) {
      if (c['A-title'] === name || c['A-nickname'] === name) return c;
    }
    return null;
  }

  /**
   * 获取所有联系人
   */
  getAllContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }

  /**
   * 按关系类型获取
   */
  getContactsByRelation(relation: string): Contact[] {
    return this.contactsByRelation.get(relation) || [];
  }

  /**
   * 搜索联系人
   */
  searchContacts(query: string): Contact[] {
    if (!query) return this.getAllContacts();
    const q = query.toLowerCase();
    return this.getAllContacts().filter(c =>
      (c['A-title'] && c['A-title'].toLowerCase().includes(q)) ||
      (c['A-nickname'] && c['A-nickname'].toLowerCase().includes(q)) ||
      (c['A-company'] && c['A-company'].toLowerCase().includes(q)) ||
      (c['A-tags'] && c['A-tags'].some(t => t.toLowerCase().includes(q)))
    );
  }

  /**
   * 获取即将到来的生日（指定天数内）
   */
  getUpcomingBirthdays(days: number = 30): Contact[] {
    const today = new Date();
    const list: { contact: Contact; daysUntil: number }[] = [];

    for (const c of this.contacts.values()) {
      if (!c['A-birthday']) continue;
      const next = this.nextBirthday(c['A-birthday'], today);
      const diff = Math.floor((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= days) list.push({ contact: c, daysUntil: diff });
    }

    list.sort((a, b) => a.daysUntil - b.daysUntil);
    return list.map(x => x.contact);
  }

  /**
   * 获取该联系的人（超过 remindInterval 天未联系）
   */
  getNeedContactContacts(): Contact[] {
    const today = new Date();
    return this.getAllContacts().filter(c => {
      if (c['A-status'] === 'archived') return false;
      const last = c['A-last-contact'];
      if (!last) return true;

      const lastDate = new Date(last);
      const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= c['A-remind-interval'];
    });
  }

  private nextBirthday(birthday: string, today: Date): Date {
    const parts = birthday.split('-');
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const year = today.getFullYear();
    let next = new Date(year, month, day);
    if (next.getTime() < today.getTime()) next = new Date(year + 1, month, day);
    return next;
  }

  /**
   * 统计
   */
  getStats(): ContactStats {
    const all = this.getAllContacts();
    const byRelation: Record<string, number> = {};
    const byPriority: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let active = 0, archived = 0;
    for (const c of all) {
      byRelation[c['A-relation']] = (byRelation[c['A-relation']] || 0) + 1;
      byPriority[c['A-priority']] = (byPriority[c['A-priority']] || 0) + 1;
      if (c['A-status'] === 'active') active++; else archived++;
    }

    return {
      total: all.length,
      active, archived,
      byRelation, byPriority,
      upcomingBirthdays: this.getUpcomingBirthdays(30),
      needContact: this.getNeedContactContacts()
    };
  }

  /**
   * 获取联系人互动记录（来自 #人脉/xxx 标签反查）
   */
  async getContactInteractions(contactId: string): Promise<ContactInteraction[]> {
    const contact = this.contacts.get(contactId);
    if (!contact) return [];

    const backlinks = await this.storage.getBacklinksForContact(
      contact['A-title'], this.settings.contactTagPrefix);

    const result: ContactInteraction[] = [];
    for (const b of backlinks) {
      const lines = b.content.split('\n');
      for (const lineNum of b.lines) {
        const lineContent = (lines[lineNum] || '').trim();
        if (!lineContent) continue;

        let date = '';
        const fname = b.file.basename;
        // 尝试从文件名提取日期
        const dateMatch = fname.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) date = dateMatch[1];
        else {
          const cache = this.storage.getFileCache(b.file);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- cache 可能为 any 类型，需要访问其 frontmatter 属性
          const fm = (cache as any)?.frontmatter;
          if (fm) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- fm 可能是 any 类型，需要访问其 date 属性
            const d = fm.date;
            if (d) date = String(d);
          }
        }

        result.push({
          date,
          fileName: b.file.basename,
          filePath: b.file.path,
          lineNumber: lineNum + 1,
          lineContent
        });
      }
    }

    result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return result;
  }
}

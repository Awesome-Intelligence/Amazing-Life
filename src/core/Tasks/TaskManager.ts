/**
 * Task Manager
 * Manages task CRUD operations
 */

import { TFile } from 'obsidian';
import { FileStorage } from '../../storage/FileStorage';
import { Task, TaskStatus, TaskPriority, PluginSettings } from '../../types';

export interface CreateTaskDTO {
  title: string;
  goal?: string | null;
  priority?: TaskPriority;
  start?: string | null;
  due?: string | null;
  description?: string | null;
  tags?: string[];
  source?: string | null;
}

export interface UpdateTaskDTO {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due?: string | null;
  start?: string | null;
  tags?: string[];
  goal?: string | null;
  description?: string | null;
}

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private tasksByGoal: Map<string, Task[]> = new Map();
  
  constructor(
    private storage: FileStorage,
    private settings: PluginSettings
  ) {}
  
  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }
  
  /**
   * 加载所有任务
   */
  async loadTasks(): Promise<void> {
    this.tasks.clear();
    this.tasksByGoal.clear();
    
    const files = this.storage.getFilesInFolder(this.storage.getTasksPath());
    
    for (const file of files) {
      if (file.name === '_index.md') continue;
      
      const content = await this.storage.readFile(file.path);
      if (content) {
        const task = this.parseTaskFromContent(file, content);
        if (task) {
          this.tasks.set(task['A-id'], task);
          
          if (task['A-goal']) {
            const goalTasks = this.tasksByGoal.get(task['A-goal']) || [];
            goalTasks.push(task);
            this.tasksByGoal.set(task['A-goal'], goalTasks);
          }
        }
      }
    }
  }
  
  /**
   * 从文件内容解析任务
   */
  private parseTaskFromContent(file: TFile, content: string): Task | null {
    const frontmatter = this.parseFrontmatterFromContent(content);
    
    if (frontmatter['A-type'] !== 'task') {
      return null;
    }
    
    const tags = frontmatter['A-tags'];
    let parsedTags: string[] = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map(String);
    } else if (typeof tags === 'string') {
      parsedTags = [tags];
    }
    
    return {
      'A-id': String(frontmatter['A-id'] || file.basename),
      'A-type': 'task',
      'A-title': String(frontmatter['A-title'] || ''),
      'A-status': (frontmatter['A-status'] || 'pending') as TaskStatus,
      'A-priority': Number(frontmatter['A-priority'] || 3) as TaskPriority,
      'A-start': frontmatter['A-start'] ? String(frontmatter['A-start']) : null,
      'A-due': frontmatter['A-due'] ? String(frontmatter['A-due']) : null,
      'A-goal': frontmatter['A-goal'] ? String(frontmatter['A-goal']) : null,
      'A-tags': parsedTags,
      'A-source': frontmatter['A-source'] ? String(frontmatter['A-source']) : null,
      'A-created': String(frontmatter['A-created'] || ''),
      'A-completed': frontmatter['A-completed'] ? String(frontmatter['A-completed']) : null,
      'A-description': frontmatter['A-description'] ? String(frontmatter['A-description']) : null
    };
  }
  
  /**
   * 直接从文件内容解析 frontmatter
   */
  private parseFrontmatterFromContent(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return result;
    }
    
    const frontmatterContent = frontmatterMatch[1];
    const lines = frontmatterContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }
      
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * 创建任务
   */
  async createTask(dto: CreateTaskDTO): Promise<Task> {
    const id = this.storage.generateId('task');
    const now = new Date().toISOString().split('T')[0];
    
    const task: Task = {
      'A-id': id,
      'A-type': 'task',
      'A-title': dto.title,
      'A-status': 'pending',
      'A-priority': dto.priority || 3,
      'A-start': dto.start || null,
      'A-due': dto.due || null,
      'A-goal': dto.goal || null,
      'A-tags': dto.tags || [],
      'A-source': dto.source || null,
      'A-created': now,
      'A-completed': null,
      'A-description': dto.description || null
    };
    
    const content = this.generateTaskContent(task);
    await this.storage.writeFile(this.storage.getTaskPath(id), content);
    
    this.tasks.set(id, task);
    
    if (task['A-goal']) {
      const goalTasks = this.tasksByGoal.get(task['A-goal']) || [];
      goalTasks.push(task);
      this.tasksByGoal.set(task['A-goal'], goalTasks);
    }
    
    return task;
  }
  
  /**
   * 生成任务文件内容
   */
  private generateTaskContent(task: Task): string {
    const lines: string[] = [
      '---',
      `A-id: ${task['A-id']}`,
      `A-type: ${task['A-type']}`,
      `A-title: ${task['A-title']}`,
      `A-status: ${task['A-status']}`,
      `A-priority: ${task['A-priority']}`,
      `A-due: ${task['A-due'] || ''}`,
      `A-goal: ${task['A-goal'] || ''}`,
      `A-tags:`,
      ...task['A-tags'].map(tag => `  - ${tag}`),
      `A-source: ${task['A-source'] || ''}`,
      `A-created: ${task['A-created']}`,
      `A-completed: ${task['A-completed'] || ''}`,
      '---',
      '',
      `# ${task['A-title']}`,
      '',
      '## 状态',
      '',
      `- [ ] 创建于 ${task['A-created']}`
    ];
    
    if (task['A-due']) {
      lines.push(`- [ ] 截止 ${task['A-due']}`);
    }
    
    if (task['A-goal']) {
      lines.push('', '## 关联目标', '');
    }
    
    return lines.join('\n');
  }
  
  /**
   * 更新任务
   */
  async updateTask(id: string, dto: UpdateTaskDTO): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    
    const now = new Date().toISOString().split('T')[0];
    
    if (dto.title !== undefined) task['A-title'] = dto.title;
    if (dto.priority !== undefined) task['A-priority'] = dto.priority;
    if (dto.due !== undefined) task['A-due'] = dto.due;
    if (dto.tags !== undefined) task['A-tags'] = dto.tags;
    
    if (dto.status !== undefined) {
      const statusChanged = task['A-status'] !== dto.status;
      task['A-status'] = dto.status;
      
      if (statusChanged) {
        if (dto.status === 'completed') {
          task['A-completed'] = now;
        } else {
          task['A-completed'] = null;
        }
      }
    }
    
    if (dto.goal !== undefined) {
      task['A-goal'] = dto.goal;
    }
    
    if (dto.start !== undefined) {
      task['A-start'] = dto.start;
    }
    
    if (dto.description !== undefined) {
      task['A-description'] = dto.description;
    }
    
    const content = await this.storage.readFile(this.storage.getTaskPath(id));
    if (content) {
      const updatedContent = this.updateTaskInContent(content, task);
      await this.storage.writeFile(this.storage.getTaskPath(id), updatedContent);
    }
    
    return task;
  }
  
  /**
   * 更新文件内容中的任务信息
   */
  private updateTaskInContent(content: string, task: Task): string {
    const lines = content.split('\n');
    const updatedLines: string[] = [];
    
    let inFrontmatter = false;
    let foundFields: Set<string> = new Set();
    
    for (const line of lines) {
      if (line === '---') {
        inFrontmatter = !inFrontmatter;
        updatedLines.push(line);
        continue;
      }
      
      if (inFrontmatter) {
        if (line.startsWith('A-title:')) {
          updatedLines.push(`A-title: ${task['A-title']}`);
          foundFields.add('A-title');
        } else if (line.startsWith('A-status:')) {
          updatedLines.push(`A-status: ${task['A-status']}`);
          foundFields.add('A-status');
        } else if (line.startsWith('A-priority:')) {
          updatedLines.push(`A-priority: ${task['A-priority']}`);
          foundFields.add('A-priority');
        } else if (line.startsWith('A-due:')) {
          updatedLines.push(`A-due: ${task['A-due'] || ''}`);
          foundFields.add('A-due');
        } else if (line.startsWith('A-start:')) {
          updatedLines.push(`A-start: ${task['A-start'] || ''}`);
          foundFields.add('A-start');
        } else if (line.startsWith('A-completed:')) {
          updatedLines.push(`A-completed: ${task['A-completed'] || ''}`);
          foundFields.add('A-completed');
        } else if (line.startsWith('A-goal:')) {
          updatedLines.push(`A-goal: ${task['A-goal'] || ''}`);
          foundFields.add('A-goal');
        } else if (line === 'A-tags:') {
          updatedLines.push(line);
          if (task['A-tags'].length === 0) {
            updatedLines.push('  - ');
          } else {
            for (const tag of task['A-tags']) {
              updatedLines.push(`  - ${tag}`);
            }
          }
          foundFields.add('A-tags');
          // Skip original tags
          let nextLine = lines[lines.indexOf(line) + 1];
          while (nextLine && nextLine.startsWith('  - ')) {
            lines.splice(lines.indexOf(nextLine), 1);
            nextLine = lines[lines.indexOf(line) + 1];
          }
        } else if (line === 'A-description:') {
          // Skip the description field line
          foundFields.add('A-description');
          continue;
        } else {
          updatedLines.push(line);
        }
      } else {
        if (line.startsWith('# ')) {
          updatedLines.push(`# ${task['A-title']}`);
        } else if (line.startsWith('## 任务描述')) {
          // Skip the description section
          continue;
        } else {
          updatedLines.push(line);
        }
      }
    }
    
    // Add missing fields before closing ---
    if (inFrontmatter === false) {
      const missingFields: string[] = [];
      if (!foundFields.has('A-start') && task['A-start']) {
        missingFields.push(`A-start: ${task['A-start']}`);
      }
      if (!foundFields.has('A-goal') && task['A-goal']) {
        missingFields.push(`A-goal: ${task['A-goal']}`);
      }
      
      if (missingFields.length > 0) {
        // Insert before closing ---
        const closingIndex = updatedLines.indexOf('---');
        if (closingIndex !== -1) {
          updatedLines.splice(closingIndex, 0, ...missingFields);
        }
      }
    }
    
    // Add description in body section
    if (task['A-description']) {
      // Find position after frontmatter
      let insertIndex = -1;
      for (let i = 0; i < updatedLines.length; i++) {
        if (updatedLines[i] === '---' && i > 0) {
          insertIndex = i + 1;
          break;
        }
      }
      
      if (insertIndex !== -1) {
        // Check if description section already exists
        const hasDescSection = updatedLines.some(l => l.startsWith('## 任务描述'));
        if (!hasDescSection) {
          updatedLines.splice(insertIndex, 0, '', '## 任务描述', '', task['A-description'], '');
        }
      }
    }
    
    return updatedLines.join('\n');
  }
  
  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    
    await this.storage.deleteFile(this.storage.getTaskPath(id));
    
    this.tasks.delete(id);
    
    if (task['A-goal']) {
      const goalTasks = this.tasksByGoal.get(task['A-goal']);
      if (goalTasks) {
        const index = goalTasks.findIndex(t => t['A-id'] === id);
        if (index !== -1) {
          goalTasks.splice(index, 1);
        }
      }
    }
  }
  
  /**
   * 获取任务
   */
  getTask(id: string): Task | null {
    return this.tasks.get(id) || null;
  }
  
  /**
   * 获取目标下的所有任务
   */
  getTasksByGoal(goalId: string): Task[] {
    return this.tasksByGoal.get(goalId) || [];
  }
  
  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * 获取今日待办任务
   */
  getTodayTasks(): Task[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getAllTasks().filter(task => 
      task['A-status'] !== 'completed' && 
      task['A-status'] !== 'cancelled' &&
      task['A-due'] === today
    );
  }

  /**
   * 获取重点任务（未完成且优先级为最高或高）
   */
  getImportantTasks(): Task[] {
    return this.getAllTasks().filter(task =>
      task['A-status'] !== 'completed' &&
      task['A-status'] !== 'cancelled' &&
      (task['A-priority'] === 1 || task['A-priority'] === 2)
    );
  }
  
  /**
   * 获取逾期任务
   */
  getOverdueTasks(): Task[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getAllTasks().filter(task =>
      task['A-status'] !== 'completed' &&
      task['A-status'] !== 'cancelled' &&
      task['A-due'] !== null &&
      task['A-due'] < today
    );
  }
  
  /**
   * 获取已完成任务
   */
  getCompletedTasks(): Task[] {
    return this.getAllTasks().filter(task => task['A-status'] === 'completed');
  }
  
  /**
   * 完成任务
   */
  async completeTask(id: string): Promise<Task | null> {
    return this.updateTask(id, { status: 'completed' });
  }
  
  /**
   * 取消任务
   */
  async cancelTask(id: string): Promise<Task | null> {
    return this.updateTask(id, { status: 'cancelled' });
  }
  
  /**
   * 开始任务
   */
  async startTask(id: string): Promise<Task | null> {
    return this.updateTask(id, { status: 'in-progress' });
  }

  /**
   * 获取任务的所有引用记录
   */
  async getTaskReferences(taskId: string): Promise<Array<{
    fileName: string;
    filePath: string;
    lineContent: string;
    lineNumber: number;
  }>> {
    const backlinks = await this.storage.getBacklinksForTask(taskId);
    const result: Array<{
      fileName: string;
      filePath: string;
      lineContent: string;
      lineNumber: number;
    }> = [];

    for (const backlink of backlinks) {
      const lines = backlink.content.split('\n');

      for (const lineNum of backlink.lines) {
        const lineContent = lines[lineNum]?.trim() || '';
        if (lineContent) {
          result.push({
            fileName: backlink.file.name.replace(/\.md$/, ''),
            filePath: backlink.file.path,
            lineContent,
            lineNumber: lineNum + 1
          });
        }
      }
    }

    result.sort((a, b) => b.lineNumber - a.lineNumber);

    return result;
  }
}

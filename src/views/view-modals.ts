/**
 * Dashboard View - Modals
 *
 * 使用 Obsidian 原生 Modal 类实现的弹窗：
 * - FieldSettingsModal：字段设置弹窗
 * - DeleteGoalWithChildrenModal：删除目标（含子目标）弹窗
 * - ParentSelectorModal：选择上级目标弹窗
 * - CreateGoalModal：创建目标弹窗
 * - TaskDetailModal：任务详情弹窗
 * - CreateTaskModal：创建任务弹窗
 * - AddCustomFieldModal：添加自定义字段弹窗
 *
 * 字段内联编辑保持不变（不是弹窗）。
 */

import { Modal, Notice, Menu } from 'obsidian';
import { CreateContactModal, EditContactModal } from './contact-modals';
import type { DashboardView } from './DashboardView';
import { DeleteConfirmModal } from './modals';
import {
  Goal,
  GoalLevel,
  TaskStatus,
  TaskPriority,
  TaskField,
  GoalField,
  DEFAULT_VIEW_FIELDS,
  GOAL_FIELD_LABELS,
  TASK_FIELD_LABELS,
  CustomFieldConfig
} from '../types';

export class ViewModals {
  constructor(private view: DashboardView) {}

  // 显示添加视图菜单 - 使用 Obsidian 原生 Menu
  showAddViewDropdown(e: MouseEvent): void {
    const view = this.view;
    const addBtn = e.currentTarget as HTMLElement;
    const rect = addBtn.getBoundingClientRect();

    const menu = new Menu();
    menu.setUseNativeMenu(true);

    menu.addItem((item) => {
      item.setTitle('列表视图')
        .setIcon('list')
        .onClick(async () => {
          await view.addTab('list');
        });
    });

    menu.addItem((item) => {
      item.setTitle('看板视图')
        .setIcon('columns')
        .onClick(async () => {
          await view.addTab('board');
        });
    });

    menu.addItem((item) => {
      item.setTitle('画廊视图')
        .setIcon('gallery-horizontal')
        .onClick(async () => {
          await view.addTab('gallery');
        });
    });

    menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
  }


  // ========== 联系人弹窗 ==========
  showCreateContactModal(): void {
    new CreateContactModal(this.view).open();
  }

  showEditContactModal(contactId: string): void {
    new EditContactModal(this.view, contactId).open();
  }

  showDeleteContactModal(contactId: string): void {
    const c = this.view.plugin.getContactManager().getContact(contactId);
    if (!c) return;
    new DeleteConfirmModal(
      this.view.plugin,
      c['A-title'],
      async () => {
        await this.view.plugin.getContactManager().deleteContact(contactId);
        new Notice('已删除');
        this.view.selectedContactId = null;
        this.view.navigateTo('dashboard');
      },
      { title: '删除联系人', confirmText: '删除' }
    ).open();
  }

  // ========== 视图添加菜单中联系人选项 ==========
  // ========== 字段设置弹窗 ==========
  showFieldSettingsModal(): void {
    new FieldSettingsModal(this.view).open();
  }

  // ========== 删除目标弹窗 ==========
  showDeleteGoalWithChildrenModal(goal: Goal, subGoals: Goal[]): void {
    new DeleteGoalWithChildrenModal(this.view, goal, subGoals).open();
  }

  // ========== 选择上级目标弹窗 ==========
  showParentSelectorModal(): void {
    new ParentSelectorModal(this.view).open();
  }

  // ========== 创建目标弹窗 ==========
  showCreateGoalModal(prefill?: { level?: number; status?: string; parent?: string }): void {
    new CreateGoalModal(this.view, prefill).open();
  }

  // ========== 任务详情弹窗 ==========
  showTaskDetailModal(taskId: string): void {
    new TaskDetailModal(this.view, taskId).open();
  }

  // ========== 创建任务弹窗 ==========
  showCreateTaskModal(): void {
    const allGoals = this.view.plugin.getGoalManager().getAllGoals();
    if (allGoals.length === 0) {
      new Notice('请先创建目标，再添加任务');
      this.showCreateGoalModal();
      return;
    }
    this.showCreateTaskModalForGoal(null);
  }

  showCreateTaskModalForGoal(goalId: string | null): void {
    new CreateTaskModal(this.view, goalId).open();
  }

  // ========== 添加自定义字段弹窗 ==========
  showAddCustomFieldModal(): void {
    new AddCustomFieldModal(this.view).open();
  }

  // ========== 字段内联编辑（保持不变） ==========
  startFieldEdit(row: HTMLElement, field: string, fieldType: string, currentValue: string): void {
    const view = this.view;
    const editableEl = row.querySelector('.al-field-editable');
    if (!editableEl) return;

    const isProgressField = row.classList.contains('al-progress-field-row');

    let inputEl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (fieldType === 'select') {
      inputEl = document.createElement('select');
      inputEl.className = isProgressField ? 'al-field-edit-select al-progress-edit-input' : 'al-field-edit-select';
      if (field === 'level') {
        const levelOptions = [
          { value: '1', label: '人生' },
          { value: '2', label: '阶段' },
          { value: '3', label: '年度' },
          { value: '4', label: '短期' }
        ];
        levelOptions.forEach(opt => {
          const optEl = document.createElement('option');
          optEl.value = opt.value;
          optEl.textContent = opt.label;
          inputEl.appendChild(optEl);
        });
      } else if (field === 'status') {
        const statusOptions = [
          { value: 'active', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'abandoned', label: '已放弃' }
        ];
        statusOptions.forEach(opt => {
          const optEl = document.createElement('option');
          optEl.value = opt.value;
          optEl.textContent = opt.label;
          inputEl.appendChild(optEl);
        });
      }
      inputEl.value = currentValue;
    } else if (fieldType === 'date') {
      inputEl = document.createElement('input');
      inputEl.type = 'date';
      inputEl.className = isProgressField ? 'al-field-edit-input al-progress-edit-input' : 'al-field-edit-input';
      inputEl.value = currentValue || '';
    } else if (fieldType === 'number') {
      inputEl = document.createElement('input');
      inputEl.type = 'number';
      inputEl.className = isProgressField ? 'al-field-edit-input al-progress-edit-input' : 'al-field-edit-input';
      inputEl.value = field === 'progress' ? currentValue.replace('%', '') : currentValue;
      if (field === 'progress') {
        inputEl.min = '0';
        inputEl.max = '100';
      }
      if (field === 'weight') {
        inputEl.min = '1';
        inputEl.max = '10';
      }
    } else if (fieldType === 'textarea') {
      inputEl = document.createElement('textarea');
      inputEl.className = 'al-field-edit-textarea';
      inputEl.rows = 3;
      inputEl.value = currentValue === '添加描述' ? '' : currentValue;
    } else {
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = isProgressField ? 'al-field-edit-input al-progress-edit-input' : 'al-field-edit-input';
      inputEl.value = currentValue;
    }

    editableEl.replaceWith(inputEl);

    const saveEdit = async () => {
      let saveValue: string | null = '';
      if (inputEl instanceof HTMLTextAreaElement) {
        saveValue = inputEl.value.trim() || null;
      } else {
        saveValue = inputEl.value;
      }

      try {
        const updateData: Record<string, unknown> = {};
        if (field === 'progress') {
          updateData[field] = parseInt(saveValue || '0') || 0;
        } else if (field === 'weight') {
          updateData[field] = parseInt(saveValue || '1') || 1;
        } else if (field === 'level') {
          updateData[field] = parseInt(saveValue || '3') || 3;
        } else {
          updateData[field] = saveValue;
        }

        await view.plugin.getGoalManager().updateGoal(view.selectedGoalId!, updateData);
        new Notice('更新成功');
        view.loadAndRender();
      } catch (error) {
        new Notice('更新失败: ' + (error as Error).message);
        view.loadAndRender();
      }
    };

    inputEl.addEventListener('blur', saveEdit);
    inputEl.addEventListener('keydown', (e) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' && fieldType !== 'textarea') {
        event.preventDefault();
        saveEdit();
      }
      if (event.key === 'Escape') {
        view.loadAndRender();
      }
    });

    inputEl.focus();
  }

  /**
   * 联系人字段内联编辑：复用 startFieldEdit 的控件构造，保存时改为 ContactManager.updateContact
   */
  startContactFieldEdit(row: HTMLElement, field: string, fieldType: string, currentValue: string): void {
    const view = this.view;
    const editableEl = row.querySelector('.al-field-editable') as HTMLElement | null;
    if (!editableEl) return;

    const settings = view.plugin.getSettings();
    const relations = settings.contactRelations || ['家人', '朋友', '同事', '客户', '导师', '同学', '邻居', '其他'];
    const statusOptions: Record<string, string> = { 'active': '活跃', 'archived': '已归档' };
    const priorityOptions: Record<string, string> = { '1': '核心', '2': '重要', '3': '一般', '4': '偶尔' };
    const genderOptions: Record<string, string> = { '': '未指定', 'male': '男', 'female': '女', 'other': '其他' };

    let inputEl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (fieldType === 'select') {
      inputEl = document.createElement('select');
      inputEl.className = 'al-field-edit-select';
      const map: Record<string, Record<string, string>> = {
        'A-relation': relations.reduce<Record<string, string>>((acc, r) => { acc[r] = r; return acc; }, {}),
        'A-status': statusOptions,
        'A-priority': priorityOptions,
        'A-gender': genderOptions
      };
      const opts = map[field];
      if (opts) {
        for (const value of Object.keys(opts)) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = opts[value];
          inputEl.appendChild(option);
        }
      }
      inputEl.value = currentValue;
    } else if (fieldType === 'date') {
      inputEl = document.createElement('input');
      inputEl.type = 'date';
      inputEl.className = 'al-field-edit-input';
      inputEl.value = currentValue || '';
    } else if (fieldType === 'number') {
      inputEl = document.createElement('input');
      inputEl.type = 'number';
      inputEl.className = 'al-field-edit-input';
      inputEl.value = currentValue;
      if (field === 'A-remind-interval') { inputEl.min = '0'; }
    } else if (fieldType === 'textarea') {
      inputEl = document.createElement('textarea');
      inputEl.className = 'al-field-edit-textarea';
      inputEl.rows = 4;
      inputEl.value = currentValue;
    } else {
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = 'al-field-edit-input';
      inputEl.value = currentValue;
    }

    editableEl.replaceWith(inputEl);

    const saveEdit = async () => {
      let saveValue: string = inputEl.value;
      if (fieldType === 'textarea') saveValue = inputEl.value.trim();
      const dto: Record<string, unknown> = {};
      if (field === 'A-tags') {
        dto[field] = saveValue.split(',').map(s => s.trim()).filter(Boolean);
      } else if (field === 'A-remind-interval') {
        dto[field] = Number(saveValue) || 0;
      } else if (field === 'A-priority') {
        dto[field] = Number(saveValue) || 3;
      } else {
        dto[field] = saveValue;
      }
      try {
        if (!view.selectedContactId) return;
        await view.plugin.getContactManager().updateContact(view.selectedContactId, dto as any);
        new Notice('已保存');
        view.loadAndRender();
      } catch (error) {
        new Notice('保存失败: ' + (error as Error).message);
        view.loadAndRender();
      }
    };

    inputEl.addEventListener('blur', saveEdit);
    inputEl.addEventListener('keydown', (e) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' && fieldType !== 'textarea') {
        event.preventDefault();
        saveEdit();
      }
      if (event.key === 'Escape') {
        view.loadAndRender();
      }
    });

    inputEl.focus();
  }

  startCustomFieldEdit(element: HTMLElement, fieldKey: string, fieldType: string, currentValue: any): void {
    const view = this.view;
    const valueSpan = element.querySelector('.al-custom-field-value');
    if (!valueSpan) return;

    const currentText = currentValue !== undefined && currentValue !== null && currentValue !== '' ? String(currentValue) : '';

    const settings = view.plugin.getSettings();
    const fieldConfig = settings.customGoalFields?.find(f => f.key === fieldKey);
    const options = fieldConfig?.options?.split(',').map(o => o.trim()) || [];

    let inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    if (fieldType === 'select' && options.length > 0) {
      inputEl = document.createElement('select');
      inputEl.className = 'al-field-edit-select al-custom-field-select';
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === currentText) option.selected = true;
        (inputEl as HTMLSelectElement).appendChild(option);
      });
    } else if (fieldType === 'number') {
      inputEl = document.createElement('input');
      inputEl.type = 'number';
      inputEl.value = currentText;
      inputEl.className = 'al-field-edit-input';
    } else if (fieldType === 'textarea') {
      inputEl = document.createElement('textarea');
      inputEl.value = currentText;
      inputEl.className = 'al-field-edit-textarea';
      inputEl.rows = 3;
    } else {
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.value = currentText;
      inputEl.className = 'al-field-edit-input';
    }

    valueSpan.replaceWith(inputEl);
    inputEl.focus();
    if ('select' in inputEl && inputEl.tagName !== 'SELECT') {
      (inputEl as HTMLInputElement).select();
    }

    const saveEdit = async () => {
      const saveValue = inputEl.value;
      inputEl.remove();

      try {
        const updateData: Record<string, any> = {};
        updateData[fieldKey] = saveValue;
        await view.plugin.getGoalManager().updateGoal(view.selectedGoalId!, updateData);
        new Notice('更新成功');
        view.loadAndRender();
      } catch (error) {
        new Notice('更新失败: ' + (error as Error).message);
        view.loadAndRender();
      }
    };

    inputEl.addEventListener('blur', saveEdit);
    inputEl.addEventListener('keydown', (e: Event) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' && fieldType !== 'textarea') {
        event.preventDefault();
        saveEdit();
      }
      if (event.key === 'Escape') {
        view.loadAndRender();
      }
    });
  }
}

// ========== Modal 类实现 ==========

/** 字段设置弹窗 */
class FieldSettingsModal extends Modal {
  private view: DashboardView;
  private currentFields: (GoalField | TaskField | string)[];

  constructor(view: DashboardView) {
    super(view.plugin.app);
    this.view = view;
    const viewKey = view.getCurrentViewType();
    const isGoalView = viewKey === 'gallery' || viewKey === 'goal' || viewKey === 'board' || viewKey === 'list';
    const settings = view.plugin.getSettings();
    this.currentFields = isGoalView
      ? [...(settings.viewFields[viewKey as 'gallery' | 'goal' | 'board' | 'list'] as GoalField[])]
      : [...(settings.viewFields[viewKey as 'dashboard'] as TaskField[])];
  }

  get viewKey(): string {
    return this.view.getCurrentViewType();
  }

  get isGoalView(): boolean {
    return ['gallery', 'goal', 'board', 'list'].includes(this.viewKey);
  }

  get fieldLabels(): Record<string, string> {
    return this.isGoalView ? GOAL_FIELD_LABELS : TASK_FIELD_LABELS;
  }

  get viewNames(): Record<string, string> {
    return { dashboard: '仪表盘任务', board: '看板目标', list: '列表目标', gallery: '画廊目标', goal: '目标详情' };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    const viewNames = this.viewNames;
    const viewKey = this.viewKey;

    contentEl.createEl('h2', { text: `字段设置 - ${viewNames[viewKey]}`, cls: 'al-modal-header' });

    const desc = contentEl.createEl('p', { text: '选择在此视图中显示的字段：', cls: 'al-field-settings-desc' });

    const togglesContainer = contentEl.createDiv('al-field-toggles');
    const fieldLabels = this.fieldLabels;
    const fields = Object.keys(fieldLabels).filter(f => !(this.isGoalView && f === 'title'));

    // 标准字段按钮
    fields.forEach(field => {
      const isSelected = this.currentFields.includes(field);
      const btn = togglesContainer.createEl('button', {
        text: fieldLabels[field as keyof typeof fieldLabels],
        cls: `al-field-toggle-btn ${isSelected ? 'selected' : ''}`,
        attr: { 'data-field': field }
      });
      btn.addEventListener('click', () => this.toggleField(field, btn));
    });

    // 自定义字段按钮
    const settings = this.view.plugin.getSettings();
    const customFields = this.isGoalView
      ? settings.customGoalFields.filter(f => f.showInViews.includes(viewKey))
      : [];

    if (customFields.length > 0) {
      contentEl.createEl('p', { text: '自定义字段：', cls: 'al-field-settings-desc al-margin-top' });
      const customTogglesContainer = contentEl.createDiv('al-field-toggles');

      customFields.forEach(cf => {
        const fieldKey = `custom_${cf.key}`;
        const isSelected = this.currentFields.includes(fieldKey);
        const btn = customTogglesContainer.createEl('button', {
          text: cf.label,
          cls: `al-field-toggle-btn al-custom-field-btn ${isSelected ? 'selected' : ''}`,
          attr: { 'data-field': fieldKey }
        });
        btn.addEventListener('click', () => this.toggleField(fieldKey, btn));
      });
    }

    // 按钮区域
    const footer = contentEl.createDiv('al-modal-footer');
    const resetBtn = footer.createEl('button', { text: '恢复默认' });
    const saveBtn = footer.createEl('button', { text: '保存', cls: 'mod-cta' });

    resetBtn.addEventListener('click', () => this.resetFields());
    saveBtn.addEventListener('click', () => this.save());
  }

  private toggleField(field: string, btn: HTMLElement): void {
    const idx = this.currentFields.indexOf(field);
    if (idx >= 0 && this.currentFields.length > 1) {
      this.currentFields.splice(idx, 1);
      btn.classList.remove('selected');
    } else if (idx < 0) {
      this.currentFields.push(field);
      btn.classList.add('selected');
    }
  }

  private resetFields(): void {
    const defaults = DEFAULT_VIEW_FIELDS[this.viewKey as keyof typeof DEFAULT_VIEW_FIELDS] as (GoalField | TaskField)[];
    this.currentFields = [...defaults];
    document.querySelectorAll('.al-field-toggle-btn').forEach(btn => {
      const field = (btn as HTMLElement).getAttribute('data-field')!;
      if (this.currentFields.includes(field as any)) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  private async save(): Promise<void> {
    const settings = this.view.plugin.getSettings();
    settings.viewFields[this.viewKey as keyof typeof settings.viewFields] = this.currentFields as any;
    await this.view.plugin.saveData(settings);
    this.view.plugin.getSettings().viewFields = settings.viewFields;
    new Notice('字段设置已保存');
    this.close();
    this.view.render();
  }
}

/** 删除目标（含子目标）弹窗 */
class DeleteGoalWithChildrenModal extends Modal {
  private view: DashboardView;
  private goal: Goal;
  private subGoals: Goal[];

  constructor(view: DashboardView, goal: Goal, subGoals: Goal[]) {
    super(view.plugin.app);
    this.view = view;
    this.goal = goal;
    this.subGoals = subGoals;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '删除目标', cls: 'al-modal-header' });

    const body = contentEl.createDiv('al-modal-body');

    body.createEl('p', {
      text: `目标「${this.goal['A-title']}」有 ${this.subGoals.length} 个子目标，请选择删除方式：`,
      cls: 'al-delete-desc'
    });

    const optionsContainer = body.createDiv('al-delete-options');

    const options = [
      { value: 'cascade', label: '级联删除', desc: '同时删除所有子目标' },
      { value: 'promote', label: '提升子目标', desc: '将子目标提升为顶级目标后再删除' },
      { value: 'cancel', label: '取消', desc: '不删除目标' }
    ];

    let selectedMode = 'cascade';
    options.forEach(opt => {
      const label = optionsContainer.createEl('label', { cls: 'al-delete-option' });

      const radio = label.createEl('input');
      radio.type = 'radio';
      radio.name = 'delete-mode';
      radio.value = opt.value;
      radio.checked = opt.value === 'cascade';

      const div = label.createEl('div');
      div.createEl('div', { text: opt.label, cls: 'al-delete-option-title' });
      div.createEl('div', { text: opt.desc, cls: 'al-delete-option-desc' });

      radio.addEventListener('change', () => {
        selectedMode = opt.value;
      });

      label.addEventListener('click', () => {
        radio.checked = true;
        selectedMode = opt.value;
      });
    });

    const footer = contentEl.createDiv('al-modal-footer');
    const confirmBtn = footer.createEl('button', { text: '确认删除', cls: 'mod-warning' });

    confirmBtn.addEventListener('click', async () => {
      if (selectedMode === 'cancel') {
        this.close();
        return;
      }

      try {
        if (selectedMode === 'promote') {
          for (const subGoal of this.subGoals) {
            await this.view.plugin.getGoalManager().updateGoal(subGoal['A-id'], { parent: null });
          }
        }
        await this.view.plugin.getGoalManager().deleteGoal(this.goal['A-id']);
        new Notice('目标已删除');
        this.close();
        this.view.goBack();
      } catch (error) {
        new Notice('删除失败: ' + (error as Error).message);
      }
    });
  }
}

/** 选择上级目标弹窗 */
class ParentSelectorModal extends Modal {
  constructor(private view: DashboardView) {
    super(view.plugin.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    if (!this.view.selectedGoalId) {
      this.close();
      return;
    }

    const currentGoal = this.view.getGoal(this.view.selectedGoalId);
    if (!currentGoal) {
      this.close();
      return;
    }

    contentEl.createEl('h2', { text: '选择上级目标', cls: 'al-modal-header' });

    const body = contentEl.createDiv('al-modal-body');

    const formItem = body.createDiv('al-form-item');
    formItem.createEl('label', { text: '上级目标' });

    const select = formItem.createEl('select');
    select.createEl('option', { value: '', text: '无（顶级目标）' });

    const allGoals = this.view.plugin.getGoalManager().getAllGoals();
    const descendants = this.view.plugin.getGoalManager().getDescendants(this.view.selectedGoalId!);
    const excludeIds = new Set([this.view.selectedGoalId!, ...descendants.map(g => g['A-id'])]);
    const levelNames: Record<number, string> = { 1: '🏆', 2: '📅', 3: '📆', 4: '⚡' };

    allGoals.filter(g => !excludeIds.has(g['A-id'])).forEach(goal => {
      const option = select.createEl('option', {
        value: goal['A-id'],
        text: `${levelNames[goal['A-level']]} ${goal['A-title']}`
      });
      if (goal['A-id'] === currentGoal['A-parent']) {
        option.selected = true;
      }
    });

    body.createEl('p', {
      text: '提示：不能选择自己或子目标作为上级目标',
      cls: 'al-form-hint'
    });

    const footer = contentEl.createDiv('al-modal-footer');
    const cancelBtn = footer.createEl('button', { text: '取消' });
    const saveBtn = footer.createEl('button', { text: '保存', cls: 'mod-cta' });

    cancelBtn.addEventListener('click', () => this.close());

    saveBtn.addEventListener('click', async () => {
      const parentId = select.value || null;
      try {
        await this.view.plugin.getGoalManager().updateGoal(this.view.selectedGoalId!, { parent: parentId });
        new Notice(parentId ? '已设置上级目标' : '已移除上级目标');
        this.close();
        this.view.loadAndRender();
      } catch (error) {
        new Notice('设置失败: ' + (error as Error).message);
      }
    });
  }
}

/** 创建目标弹窗 */
class CreateGoalModal extends Modal {
  private prefill?: { level?: number; status?: string; parent?: string };

  constructor(private view: DashboardView, prefill?: { level?: number; status?: string; parent?: string }) {
    super(view.plugin.app);
    this.prefill = prefill;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '创建目标', cls: 'al-modal-header' });

    const form = contentEl.createEl('form');
    form.id = 'al-goal-form';
    form.addClass('al-form');

    // 目标名称
    const titleItem = form.createDiv('al-form-item');
    titleItem.createEl('label', { text: '目标名称' });
    const titleInput = titleItem.createEl('input');
    titleInput.type = 'text';
    titleInput.required = true;
    titleInput.placeholder = '例如：学习一门新语言';

    // 目标层级
    const levelItem = form.createDiv('al-form-item');
    levelItem.createEl('label', { text: '目标层级' });
    const levelSelect = levelItem.createEl('select');

    const levelLabels: Record<number, string> = { 1: '🏆 人生目标', 2: '📅 阶段目标', 3: '📆 年度目标', 4: '⚡ 短期目标' };
    [1, 2, 3, 4].forEach(level => {
      const option = levelSelect.createEl('option', { value: String(level), text: levelLabels[level] });
      if (this.prefill?.level === level || (!this.prefill?.level && level === 3)) {
        option.selected = true;
      }
    });

    // 上级目标
    const parentItem = form.createDiv('al-form-item');
    parentItem.createEl('label', { text: '上级目标（可选）' });
    const parentSelect = parentItem.createEl('select');

    parentSelect.createEl('option', { value: '', text: '无' });
    const allGoals = this.view.plugin.getGoalManager().getAllGoals();
    const levelNames: Record<number, string> = { 1: '🏆', 2: '📅', 3: '📆', 4: '⚡' };
    allGoals.forEach(goal => {
      const option = parentSelect.createEl('option', {
        value: goal['A-id'],
        text: `${levelNames[goal['A-level']]} ${goal['A-title']}`
      });
      if (this.prefill?.parent === goal['A-id']) {
        option.selected = true;
      }
    });

    // 截止日期
    const dueItem = form.createDiv('al-form-item');
    dueItem.createEl('label', { text: '截止日期' });
    const dueInput = dueItem.createEl('input');
    dueInput.type = 'date';

    const footer = contentEl.createDiv('al-form-actions');
    const cancelBtn = footer.createEl('button', { text: '取消', type: 'button' });
    const submitBtn = footer.createEl('button', { text: '创建', cls: 'mod-cta' });

    cancelBtn.addEventListener('click', () => this.close());

    const handleSubmit = async () => {
      const title = titleInput.value.trim();
      const level = Number(levelSelect.value) as GoalLevel;
      const parent = parentSelect.value || null;
      const due = dueInput.value || null;

      if (!title) {
        new Notice('请输入目标名称');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '创建中...';

      try {
        const result = await this.view.plugin.getGoalManager().createGoal({ title, level, due, parent });
        new Notice('目标创建成功！');
        this.close();
        this.view.loadAndRender();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[CreateGoalModal] Create goal error:', error);
        new Notice('创建失败: ' + errorMessage);
        submitBtn.disabled = false;
        submitBtn.textContent = '创建';
      }
    };

    // 绑定按钮点击事件
    submitBtn.addEventListener('click', handleSubmit);

    // 绑定表单回车提交
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });

    setTimeout(() => titleInput.focus(), 100);
  }
}

/** 任务详情弹窗 */
class TaskDetailModal extends Modal {
  private taskId: string;

  constructor(private view: DashboardView, taskId: string) {
    super(view.plugin.app);
    this.taskId = taskId;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    const task = this.view.getTask(this.taskId);
    if (!task) {
      new Notice('任务不存在');
      this.close();
      return;
    }

    contentEl.createEl('h2', { text: '任务详情', cls: 'al-modal-header' });

    const form = contentEl.createEl('form');
    form.id = 'al-task-form';
    form.addClass('al-form');

    // 任务名称
    const titleItem = form.createDiv('al-form-item');
    titleItem.createEl('label', { text: '任务名称' });
    const titleInput = titleItem.createEl('input');
    titleInput.type = 'text';
    titleInput.value = task['A-title'];
    titleInput.required = true;
    titleInput.placeholder = '输入任务名称...';

    // 状态
    const statusItem = form.createDiv('al-form-item');
    statusItem.createEl('label', { text: '状态' });
    const statusSelect = statusItem.createEl('select');
    ['pending', 'in-progress', 'completed', 'cancelled'].forEach((s, i) => {
      const option = statusSelect.createEl('option', { value: s, text: ['待办', '进行中', '已完成', '已取消'][i] });
      if (s === task['A-status']) option.selected = true;
    });

    // 优先级
    const priorityItem = form.createDiv('al-form-item');
    priorityItem.createEl('label', { text: '优先级' });
    const prioritySelect = priorityItem.createEl('select');
    [1, 2, 3, 4, 5].forEach(p => {
      const option = prioritySelect.createEl('option', { value: String(p), text: ['🔴 最高', '🟠 高', '🟡 中', '🟢 低', '⚪ 最低'][p - 1] });
      if (p === task['A-priority']) option.selected = true;
    });

    // 开始时间
    const startItem = form.createDiv('al-form-item');
    startItem.createEl('label', { text: '开始时间' });
    const startInput = startItem.createEl('input');
    startInput.type = 'date';
    startInput.value = task['A-start'] || '';

    // 截止时间
    const dueItem = form.createDiv('al-form-item');
    dueItem.createEl('label', { text: '截止时间' });
    const dueInput = dueItem.createEl('input');
    dueInput.type = 'date';
    dueInput.value = task['A-due'] || '';

    // 关联目标
    const goalItem = form.createDiv('al-form-item');
    goalItem.createEl('label', { text: '关联目标' });
    const goalSelect = goalItem.createEl('select');
    goalSelect.createEl('option', { value: '', text: '无' });
    const allGoals = this.view.plugin.getGoalManager().getAllGoals();
    allGoals.forEach(goal => {
      const option = goalSelect.createEl('option', { value: goal['A-id'], text: goal['A-title'] });
      if (goal['A-id'] === task['A-goal']) option.selected = true;
    });

    // 任务描述
    const descItem = form.createDiv('al-form-item');
    descItem.createEl('label', { text: '任务描述' });
    const descTextarea = descItem.createEl('textarea');
    descTextarea.value = task['A-description'] || '';
    descTextarea.placeholder = '添加任务描述...';
    descTextarea.rows = 4;

    // 底部按钮
    const footer = contentEl.createDiv('al-form-actions');
    const deleteBtn = footer.createEl('button', { text: '删除', cls: 'mod-warning', type: 'button' });
    const spacer = footer.createDiv('al-view-spacer');
    const cancelBtn = footer.createEl('button', { text: '取消', type: 'button' });
    const saveBtn = footer.createEl('button', { text: '保存', cls: 'mod-cta', type: 'submit' });

    deleteBtn.addEventListener('click', async () => {
      const taskTitle = titleInput.value.trim() || '此任务';
      new DeleteConfirmModal(
        this.view.plugin,
        taskTitle,
        async () => {
          try {
            await this.view.plugin.getTaskManager().deleteTask(this.taskId);
            new Notice('任务已删除');
            this.close();
            this.view.loadAndRender();
          } catch (error) {
            new Notice('删除失败: ' + (error as Error).message);
          }
        },
        {
          title: '删除任务',
          message: `确定要删除任务「${taskTitle}」吗？此操作不可撤销。`,
          confirmText: '删除'
        }
      ).open();
    });

    cancelBtn.addEventListener('click', () => this.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      const status = statusSelect.value as TaskStatus;
      const priority = Number(prioritySelect.value) as TaskPriority;
      const start = startInput.value || null;
      const due = dueInput.value || null;
      const goal = goalSelect.value || null;
      const description = descTextarea.value.trim() || null;

      if (!title) {
        new Notice('请输入任务名称');
        return;
      }

      try {
        await this.view.plugin.getTaskManager().updateTask(this.taskId, { title, status, priority, start, due, goal, description });
        new Notice('任务已保存');
        this.close();
        this.view.loadAndRender();
      } catch (error) {
        new Notice('保存失败: ' + (error as Error).message);
      }
    });

    setTimeout(() => titleInput.focus(), 100);
  }
}

/** 创建任务弹窗 */
class CreateTaskModal extends Modal {
  private goalId: string | null;

  constructor(private view: DashboardView, goalId: string | null) {
    super(view.plugin.app);
    this.goalId = goalId;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '创建任务', cls: 'al-modal-header' });

    const form = contentEl.createEl('form');
    form.id = 'al-task-form';
    form.addClass('al-form');

    // 任务名称
    const titleItem = form.createDiv('al-form-item');
    titleItem.createEl('label', { text: '任务名称' });
    const titleInput = titleItem.createEl('input');
    titleInput.type = 'text';
    titleInput.required = true;
    titleInput.placeholder = '例如：完成项目报告';

    // 关联目标
    const goalItem = form.createDiv('al-form-item');
    goalItem.createEl('label', { text: '关联目标 *' });
    const goalSelect = goalItem.createEl('select');
    goalSelect.required = true;
    goalSelect.createEl('option', { value: '', text: '请选择目标...' });

    const allGoals = this.view.plugin.getGoalManager().getAllGoals();
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const goalsByLevel: Record<number, Goal[]> = { 1: [], 2: [], 3: [], 4: [] };
    allGoals.forEach(goal => goalsByLevel[goal['A-level']].push(goal));

    [1, 2, 3, 4].filter(level => goalsByLevel[level].length > 0).forEach(level => {
      const optgroup = goalSelect.createEl('optgroup');
      optgroup.label = levelNames[level];
      goalsByLevel[level].forEach(goal => {
        const option = optgroup.createEl('option', { value: goal['A-id'], text: goal['A-title'] });
        if (goal['A-id'] === this.goalId) {
          option.selected = true;
        }
      });
    });

    // 优先级
    const priorityItem = form.createDiv('al-form-item');
    priorityItem.createEl('label', { text: '优先级' });
    const prioritySelect = priorityItem.createEl('select');
    [1, 2, 3, 4, 5].forEach(p => {
      const option = prioritySelect.createEl('option', { value: String(p), text: ['🔴 最高', '🟠 高', '🟡 中 (默认)', '🟢 低', '⚪ 最低'][p - 1] });
      if (p === 3) option.selected = true;
    });

    // 截止日期
    const dueItem = form.createDiv('al-form-item');
    dueItem.createEl('label', { text: '截止日期' });
    const dueInput = dueItem.createEl('input');
    dueInput.type = 'date';
    dueInput.value = new Date().toISOString().split('T')[0];

    const footer = form.createDiv('al-form-actions');
    const cancelBtn = footer.createEl('button', { text: '取消', type: 'button' });
    const submitBtn = footer.createEl('button', { text: '创建', type: 'submit', cls: 'mod-cta' });

    cancelBtn.addEventListener('click', () => this.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      const selectedGoalId = goalSelect.value;
      const priority = Number(prioritySelect.value) as TaskPriority;
      const due = dueInput.value || null;

      if (!title) {
        new Notice('请输入任务名称');
        return;
      }
      if (!selectedGoalId) {
        new Notice('请选择关联目标');
        return;
      }

      try {
        await this.view.plugin.getTaskManager().createTask({ title, priority, due, goal: selectedGoalId });
        new Notice('任务创建成功！');
        this.close();
        this.view.loadAndRender();
      } catch (error) {
        new Notice('创建失败: ' + (error as Error).message);
      }
    });

    setTimeout(() => titleInput.focus(), 100);
  }
}

/** 添加自定义字段弹窗 */
class AddCustomFieldModal extends Modal {
  constructor(private view: DashboardView) {
    super(view.plugin.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '添加自定义字段', cls: 'al-modal-header' });

    const body = contentEl.createDiv('al-form');
    // body already has al-form class with padding

    // 字段名称
    const keyItem = body.createDiv('al-form-item');
    keyItem.createEl('label', { text: '字段名称' });
    const keyInput = keyItem.createEl('input');
    keyInput.type = 'text';
    keyInput.placeholder = '输入字段名称（如：备注、标签）';

    // 显示标签
    const labelItem = body.createDiv('al-form-item');
    labelItem.createEl('label', { text: '显示标签' });
    const labelInput = labelItem.createEl('input');
    labelInput.type = 'text';
    labelInput.placeholder = '输入显示名称';

    // 字段类型
    const typeItem = body.createDiv('al-form-item');
    typeItem.createEl('label', { text: '字段类型' });
    const typeSelect = typeItem.createEl('select');
    ['text', 'number', 'date', 'select'].forEach(t => {
      typeSelect.createEl('option', { value: t, text: { text: '文本', number: '数字', date: '日期', select: '单选' }[t] });
    });

    // 选项（单选类型时显示）
    const optionsRow = body.createDiv('al-form-item al-hidden');
    optionsRow.createEl('label', { text: '选项（逗号分隔）' });
    const optionsInput = optionsRow.createEl('input');
    optionsInput.type = 'text';
    optionsInput.placeholder = '如：重要,普通,紧急';

    // 字段值
    const valueItem = body.createDiv('al-form-item');
    valueItem.createEl('label', { text: '字段值（可选）' });
    const valueInput = valueItem.createEl('input');
    valueInput.type = 'text';
    valueInput.placeholder = '输入字段值';

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'select') {
        optionsRow.classList.remove('al-hidden');
      } else {
        optionsRow.classList.add('al-hidden');
      }
    });

    const footer = contentEl.createDiv('al-modal-footer');
    const cancelBtn = footer.createEl('button', { text: '取消' });
    const saveBtn = footer.createEl('button', { text: '保存', cls: 'mod-cta' });

    cancelBtn.addEventListener('click', () => this.close());

    saveBtn.addEventListener('click', async () => {
      const fieldKey = keyInput.value.trim();
      const fieldLabel = labelInput.value.trim() || fieldKey;
      const fieldType = typeSelect.value;
      const fieldOptions = typeSelect.value === 'select' ? optionsInput.value.trim() : '';
      const fieldValue = valueInput.value.trim();

      if (!fieldKey) {
        new Notice('请输入字段名称');
        return;
      }

      const settings = this.view.plugin.getSettings();
      const existingFields = settings.customGoalFields || [];
      if (existingFields.some(f => f.key === fieldKey)) {
        new Notice('该字段已存在');
        return;
      }

      const newField: CustomFieldConfig = {
        key: fieldKey,
        label: fieldLabel,
        type: fieldType as 'text' | 'number' | 'date' | 'select',
        options: fieldOptions,
        showInViews: ['gallery', 'list', 'board']
      };

      existingFields.push(newField);
      settings.customGoalFields = existingFields;
      await this.view.plugin.saveSettings();

      if (fieldValue && this.view.selectedGoalId) {
        const updateData: Record<string, any> = {};
        updateData[fieldKey] = fieldValue;
        await this.view.plugin.getGoalManager().updateGoal(this.view.selectedGoalId, updateData);
      }

      new Notice('自定义字段已添加');
      this.close();
      this.view.loadAndRender();
    });

    setTimeout(() => keyInput.focus(), 100);
  }
}

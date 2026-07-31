/**
 * Dashboard View - Modals & Inline Edit Helpers
 *
 * 从 DashboardView.ts 抽出的弹窗与字段内联编辑逻辑：
 * - 字段设置弹窗（showFieldSettingsModal）
 * - 添加视图下拉菜单（showAddViewDropdown）
 * - 目标删除/父目标选择弹窗
 * - 目标/任务创建弹窗
 * - 任务详情弹窗
 * - 字段内联编辑（startFieldEdit / startCustomFieldEdit）
 * - 自定义字段添加弹窗
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import { Notice, Menu } from 'obsidian';
import type { DashboardView } from './DashboardView';
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

  showFieldSettingsModal(): void {
    const view = this.view;
    const viewKey = view.getCurrentViewType();
    const isGoalView = viewKey === 'gallery' || viewKey === 'goal' || viewKey === 'board' || viewKey === 'list';
    const settings = view.plugin.getSettings();
    const currentFields = isGoalView
      ? (settings.viewFields[viewKey as 'gallery' | 'goal' | 'board' | 'list'] as GoalField[])
      : (settings.viewFields[viewKey as 'dashboard'] as TaskField[]);

    const fieldLabels = isGoalView ? GOAL_FIELD_LABELS : TASK_FIELD_LABELS;
    // 目标视图排除 title 字段（标题始终显示）
    const fields = Object.keys(fieldLabels).filter(f => !(isGoalView && f === 'title')) as (GoalField | TaskField)[];
    const viewNames: Record<string, string> = { dashboard: '仪表盘任务', board: '看板目标', list: '列表目标', gallery: '画廊目标', goal: '目标详情' };

    // 获取可用的自定义字段（仅目标视图）
    const customFields = isGoalView
      ? settings.customGoalFields.filter(f => f.showInViews.includes(viewKey))
      : [];

    const modal = document.createElement('div');
    modal.className = 'al-modal';

    const fieldsHtml = fields.map(field => {
      const isSelected = currentFields.includes(field as any);
      return `<button class="al-field-toggle-btn ${isSelected ? 'selected' : ''}" data-field="${field}">${fieldLabels[field as keyof typeof fieldLabels]}</button>`;
    }).join('');

    // 自定义字段按钮
    const customFieldsHtml = customFields.map(cf => {
      const fieldKey = `custom_${cf.key}`;
      const isSelected = currentFields.includes(fieldKey as any);
      return `<button class="al-field-toggle-btn al-custom-field-btn ${isSelected ? 'selected' : ''}" data-field="${fieldKey}">${cf.label}</button>`;
    }).join('');

    const customFieldsSection = customFields.length > 0
      ? `<p class="al-field-settings-desc" style="margin-top:12px">自定义字段：</p>
         <div class="al-field-toggles">${customFieldsHtml}</div>`
      : '';

    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box al-field-settings-modal">
        <div class="al-modal-header">
          <span>⚙️ 字段设置 - ${viewNames[viewKey]}</span>
          <button class="al-modal-close">×</button>
        </div>
        <div class="al-modal-body">
          <p class="al-field-settings-desc">选择在此视图中显示的字段：</p>
          <div class="al-field-toggles">${fieldsHtml}</div>
          ${customFieldsSection}
        </div>
        <div class="al-modal-footer">
          <button class="al-btn" id="al-reset-fields">恢复默认</button>
          <button class="mod-cta" id="al-save-fields">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);

    // Field toggle clicks
    modal.querySelectorAll('.al-field-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-field')!;
        const idx = currentFields.indexOf(field as any);
        if (idx >= 0 && currentFields.length > 1) {
          currentFields.splice(idx, 1);
          btn.classList.remove('selected');
        } else if (idx < 0) {
          currentFields.push(field as any);
          btn.classList.add('selected');
        }
      });
    });

    // Reset button
    modal.querySelector('#al-reset-fields')?.addEventListener('click', () => {
      const defaults = DEFAULT_VIEW_FIELDS[viewKey as keyof typeof DEFAULT_VIEW_FIELDS];
      currentFields.length = 0;
      currentFields.push(...defaults as any);
      modal.querySelectorAll('.al-field-toggle-btn').forEach(btn => {
        const field = btn.getAttribute('data-field')!;
        if (currentFields.includes(field as any)) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    });

    // Save button
    modal.querySelector('#al-save-fields')?.addEventListener('click', async () => {
      settings.viewFields[viewKey as keyof typeof settings.viewFields] = [...currentFields] as any;
      await view.plugin.saveData(settings);
      // 刷新插件设置缓存
      view.plugin.getSettings().viewFields = settings.viewFields;
      new Notice('字段设置已保存');
      close();
      view.render();
    });
  }

  // 显示添加视图菜单 - 使用 Obsidian 原生 Menu，与目标详情页省略号菜单风格一致
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

  showDeleteGoalWithChildrenModal(goal: Goal, subGoals: Goal[]): void {
    const view = this.view;
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box" style="max-width:420px;">
        <div class="al-modal-header">
          <span>⚠️ 删除目标</span>
          <button class="al-modal-close">&times;</button>
        </div>
        <div style="padding:20px;">
          <p style="margin:0 0 16px;font-size:14px;color:var(--text-primary);">
            目标「<strong>${goal['A-title']}</strong>」有 <strong>${subGoals.length}</strong> 个子目标，请选择删除方式：
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;" class="al-delete-option">
              <input type="radio" name="delete-mode" value="cascade" checked style="margin-top:3px;">
              <div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);">级联删除</div>
                <div style="font-size:12px;color:var(--text-muted);">同时删除所有子目标</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;" class="al-delete-option">
              <input type="radio" name="delete-mode" value="promote" style="margin-top:3px;">
              <div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);">提升子目标</div>
                <div style="font-size:12px;color:var(--text-muted);">将子目标提升为顶级目标后再删除</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;" class="al-delete-option">
              <input type="radio" name="delete-mode" value="cancel" style="margin-top:3px;">
              <div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);">取消</div>
                <div style="font-size:12px;color:var(--text-muted);">不删除目标</div>
              </div>
            </label>
          </div>
        </div>
        <div class="al-modal-footer">
          <button class="mod-cta" id="al-confirm-delete-with-children" style="padding:8px 16px;border:none;border-radius:6px;background:var(--text-red);color:#fff;cursor:pointer;">确认删除</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);

    // 选中样式
    modal.querySelectorAll('.al-delete-option').forEach(option => {
      option.addEventListener('click', () => {
        modal.querySelectorAll('.al-delete-option').forEach(o => (o as HTMLElement).style.borderColor = 'var(--border-color)');
        (option as HTMLElement).style.borderColor = 'var(--interactive-accent)';
      });
    });

    modal.querySelector('#al-confirm-delete-with-children')?.addEventListener('click', async () => {
      const selectedMode = (modal.querySelector('input[name="delete-mode"]:checked') as HTMLInputElement)?.value;

      if (selectedMode === 'cancel') {
        close();
        return;
      }

      try {
        if (selectedMode === 'promote') {
          // 提升子目标：移除所有子目标的父目标引用
          for (const subGoal of subGoals) {
            await view.plugin.getGoalManager().updateGoal(subGoal['A-id'], { parent: null });
          }
        }
        // 删除目标
        await view.plugin.getGoalManager().deleteGoal(goal['A-id']);
        new Notice('目标已删除');
        close();
        view.goBack();
      } catch (error) {
        new Notice('删除失败: ' + (error as Error).message);
      }
    });
  }

  showParentSelectorModal(): void {
    const view = this.view;
    if (!view.selectedGoalId) return;

    const currentGoal = view.getGoal(view.selectedGoalId);
    if (!currentGoal) return;

    const allGoals = view.plugin.getGoalManager().getAllGoals();
    // 排除自己和自己的子目标（防止循环引用）
    const descendants = view.plugin.getGoalManager().getDescendants(view.selectedGoalId);
    const excludeIds = new Set([view.selectedGoalId, ...descendants.map(g => g['A-id'])]);

    const levelNames: Record<number, string> = { 1: '🏆', 2: '📅', 3: '📆', 4: '⚡' };

    const availableGoals = allGoals.filter(g => !excludeIds.has(g['A-id']));

    const goalOptions = availableGoals.map(goal => {
      const selected = goal['A-id'] === currentGoal['A-parent'] ? 'selected' : '';
      return `<option value="${goal['A-id']}" ${selected}>${levelNames[goal['A-level']]} ${goal['A-title']}</option>`;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box" style="max-width:400px;">
        <div class="al-modal-header">
          <span>选择上级目标</span>
          <button class="al-modal-close">&times;</button>
        </div>
        <div style="padding:20px;">
          <div class="al-form-item">
            <label>上级目标</label>
            <select id="al-parent-select" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;">
              <option value="">无（顶级目标）</option>
              ${goalOptions}
            </select>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;">提示：不能选择自己或子目标作为上级目标</p>
        </div>
        <div class="al-modal-footer">
          <button class="al-btn-secondary" id="al-parent-cancel" style="padding:8px 16px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);cursor:pointer;">取消</button>
          <button class="mod-cta" id="al-parent-save" style="padding:8px 16px;border:none;border-radius:6px;background:var(--interactive-accent);color:#fff;cursor:pointer;">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-parent-cancel')?.addEventListener('click', close);

    modal.querySelector('#al-parent-save')?.addEventListener('click', async () => {
      const parentId = (modal.querySelector('#al-parent-select') as HTMLSelectElement).value || null;

      try {
        await view.plugin.getGoalManager().updateGoal(view.selectedGoalId!, { parent: parentId });
        new Notice(parentId ? '已设置上级目标' : '已移除上级目标');
        close();
        view.loadAndRender();
      } catch (error) {
        new Notice('设置失败: ' + (error as Error).message);
      }
    });
  }

  showCreateGoalModal(prefill?: { level?: number; status?: string; parent?: string }): void {
    const view = this.view;
    const levelOptions = [1, 2, 3, 4].map(level => {
      const labels: Record<number, string> = { 1: '🏆 人生目标', 2: '📅 阶段目标', 3: '📆 年度目标', 4: '⚡ 短期目标' };
      const selected = prefill?.level === level ? 'selected' : (level === 3 && !prefill?.level ? 'selected' : '');
      return `<option value="${level}" ${selected}>${labels[level]}</option>`;
    }).join('');

    // 获取可选的父目标列表
    const allGoals = view.plugin.getGoalManager().getAllGoals();
    const levelNames: Record<number, string> = { 1: '🏆', 2: '📅', 3: '📆', 4: '⚡' };
    const parentOptions = allGoals.map(goal => {
      const selected = prefill?.parent === goal['A-id'] ? 'selected' : '';
      return `<option value="${goal['A-id']}" ${selected}>${levelNames[goal['A-level']]} ${goal['A-title']}</option>`;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `<div class="al-modal-bg"></div><div class="al-modal-box"><div class="al-modal-header"><span>🎯 创建目标</span><button class="al-modal-close">×</button></div><form id="al-goal-form"><div class="al-form-item"><label>目标名称</label><input type="text" id="al-goal-title" required placeholder="例如：学习一门新语言"></div><div class="al-form-item"><label>目标层级</label><select id="al-goal-level">${levelOptions}</select></div><div class="al-form-item"><label>上级目标（可选）</label><select id="al-goal-parent"><option value="">无</option>${parentOptions}</select></div><div class="al-form-item"><label>截止日期</label><input type="date" id="al-goal-due"></div><div class="al-form-actions"><button type="button" id="al-cancel-goal">取消</button><button type="submit" class="mod-cta">创建</button></div></form></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-goal')?.addEventListener('click', close);
    modal.querySelector('#al-goal-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const title = (modal.querySelector('#al-goal-title') as HTMLInputElement).value.trim(); const level = Number((modal.querySelector('#al-goal-level') as HTMLSelectElement).value) as GoalLevel; const parent = (modal.querySelector('#al-goal-parent') as HTMLSelectElement).value || null; const due = (modal.querySelector('#al-goal-due') as HTMLInputElement).value || null; if (!title) { new Notice('请输入目标名称'); return; } try { await view.plugin.getGoalManager().createGoal({ title, level, due, parent }); new Notice('目标创建成功！'); close(); view.loadAndRender(); } catch (error) { new Notice('创建失败: ' + (error as Error).message); } });

    // 自动聚焦到标题输入框
    setTimeout(() => (modal.querySelector('#al-goal-title') as HTMLInputElement)?.focus(), 100);
  }

  showTaskDetailModal(taskId: string): void {
    const view = this.view;
    const task = view.getTask(taskId);
    if (!task) { new Notice('任务不存在'); return; }

    const allGoals = view.plugin.getGoalManager().getAllGoals();
    const goalOptions = allGoals.map(goal => `<option value="${goal['A-id']}" ${goal['A-id'] === task['A-goal'] ? 'selected' : ''}>${goal['A-title']}</option>`).join('');
    const priorityOptions = [1, 2, 3, 4, 5].map(p => `<option value="${p}" ${p === task['A-priority'] ? 'selected' : ''}>${['🔴 最高', '🟠 高', '🟡 中', '🟢 低', '⚪ 最低'][p - 1]}</option>`).join('');
    const statusOptions = ['pending', 'in-progress', 'completed', 'cancelled'].map(s => `<option value="${s}" ${s === task['A-status'] ? 'selected' : ''}>${['待办', '进行中', '已完成', '已取消'][['pending', 'in-progress', 'completed', 'cancelled'].indexOf(s)]}</option>`).join('');

    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box al-modal-task-detail">
        <div class="al-modal-header">
          <span>📋 任务详情</span>
          <button class="al-modal-close">×</button>
        </div>
        <div class="al-modal-body">
          <div class="al-task-detail-title">
            <input type="text" id="al-task-detail-title" value="${task['A-title']}" placeholder="任务名称">
          </div>
          <div class="al-task-detail-fields">
            <div class="al-task-detail-field">
              <label>📊 状态</label>
              <select id="al-task-detail-status">${statusOptions}</select>
            </div>
            <div class="al-task-detail-field">
              <label>⭐ 优先级</label>
              <select id="al-task-detail-priority">${priorityOptions}</select>
            </div>
            <div class="al-task-detail-field">
              <label>📅 开始时间</label>
              <input type="date" id="al-task-detail-start" value="${task['A-start'] || ''}">
            </div>
            <div class="al-task-detail-field">
              <label>⏰ 截止时间</label>
              <input type="date" id="al-task-detail-due" value="${task['A-due'] || ''}">
            </div>
            <div class="al-task-detail-field">
              <label>🎯 关联目标</label>
              <select id="al-task-detail-goal"><option value="">无</option>${goalOptions}</select>
            </div>
          </div>
          <div class="al-task-detail-desc-section">
            <label>📝 任务描述</label>
            <textarea id="al-task-detail-description" placeholder="添加任务描述...">${task['A-description'] || ''}</textarea>
          </div>
        </div>
        <div class="al-modal-footer">
          <button type="button" class="al-btn-danger" id="al-task-detail-delete">🗑️ 删除</button>
          <button type="button" class="al-btn-secondary" id="al-task-detail-cancel">取消</button>
          <button type="button" class="mod-cta" id="al-task-detail-save">💾 保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();

    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-task-detail-cancel')?.addEventListener('click', close);

    modal.querySelector('#al-task-detail-delete')?.addEventListener('click', async () => {
      if (confirm('确定要删除这个任务吗？')) {
        try {
          await view.plugin.getTaskManager().deleteTask(taskId);
          new Notice('任务已删除');
          close();
          view.loadAndRender();
        } catch (error) {
          new Notice('删除失败: ' + (error as Error).message);
        }
      }
    });

    modal.querySelector('#al-task-detail-save')?.addEventListener('click', async () => {
      const title = (modal.querySelector('#al-task-detail-title') as HTMLInputElement).value.trim();
      const status = (modal.querySelector('#al-task-detail-status') as HTMLSelectElement).value as TaskStatus;
      const priority = Number((modal.querySelector('#al-task-detail-priority') as HTMLSelectElement).value) as TaskPriority;
      const start = (modal.querySelector('#al-task-detail-start') as HTMLInputElement).value || null;
      const due = (modal.querySelector('#al-task-detail-due') as HTMLInputElement).value || null;
      const goal = (modal.querySelector('#al-task-detail-goal') as HTMLSelectElement).value || null;
      const description = (modal.querySelector('#al-task-detail-description') as HTMLTextAreaElement).value.trim() || null;

      if (!title) { new Notice('请输入任务名称'); return; }

      try {
        await view.plugin.getTaskManager().updateTask(taskId, { title, status, priority, start, due, goal, description });
        new Notice('任务已保存');
        close();
        view.loadAndRender();
      } catch (error) {
        new Notice('保存失败: ' + (error as Error).message);
      }
    });
  }

  showCreateTaskModal(): void {
    const view = this.view;
    const allGoals = view.plugin.getGoalManager().getAllGoals();
    if (allGoals.length === 0) { new Notice('请先创建目标，再添加任务'); this.showCreateGoalModal(); return; }
    this.showCreateTaskModalForGoal(null);
  }

  showCreateTaskModalForGoal(goalId: string | null): void {
    const view = this.view;
    const allGoals = view.plugin.getGoalManager().getAllGoals();
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const goalsByLevel: Record<number, Goal[]> = { 1: [], 2: [], 3: [], 4: [] };
    allGoals.forEach(goal => goalsByLevel[goal['A-level']].push(goal));
    const goalOptions = [1, 2, 3, 4].filter(level => goalsByLevel[level].length > 0).map(level => `<optgroup label="${levelNames[level]}">${goalsByLevel[level].map(goal => `<option value="${goal['A-id']}" ${goal['A-id'] === goalId ? 'selected' : ''}>${goal['A-title']}</option>`).join('')}</optgroup>`).join('');
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `<div class="al-modal-bg"></div><div class="al-modal-box"><div class="al-modal-header"><span>📋 创建任务</span><button class="al-modal-close">×</button></div><form id="al-task-form"><div class="al-form-item"><label>任务名称</label><input type="text" id="al-task-title" required placeholder="例如：完成项目报告"></div><div class="al-form-item"><label>关联目标 *</label><select id="al-task-goal" required><option value="">请选择目标...</option>${goalOptions}</select></div><div class="al-form-item"><label>优先级</label><select id="al-task-priority"><option value="1">🔴 最高</option><option value="2">🟠 高</option><option value="3" selected>🟡 中</option><option value="4">🟢 低</option><option value="5">⚪ 最低</option></select></div><div class="al-form-item"><label>截止日期</label><input type="date" id="al-task-due" value="${new Date().toISOString().split('T')[0]}"></div><div class="al-form-actions"><button type="button" id="al-cancel-task">取消</button><button type="submit" class="mod-cta">创建</button></div></form></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-task')?.addEventListener('click', close);
    modal.querySelector('#al-task-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const title = (modal.querySelector('#al-task-title') as HTMLInputElement).value.trim(); const selectedGoalId = (modal.querySelector('#al-task-goal') as HTMLSelectElement).value; const priority = Number((modal.querySelector('#al-task-priority') as HTMLSelectElement).value) as TaskPriority; const due = (modal.querySelector('#al-task-due') as HTMLInputElement).value || null; if (!title) { new Notice('请输入任务名称'); return; } if (!selectedGoalId) { new Notice('请选择关联目标'); return; } try { await view.plugin.getTaskManager().createTask({ title, priority, due, goal: selectedGoalId }); new Notice('任务创建成功！'); close(); view.loadAndRender(); } catch (error) { new Notice('创建失败: ' + (error as Error).message); } });
  }

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
        inputEl.innerHTML = '<option value="1">人生</option><option value="2">阶段</option><option value="3">年度</option><option value="4">短期</option>';
      } else if (field === 'status') {
        inputEl.innerHTML = '<option value="active">进行中</option><option value="completed">已完成</option><option value="abandoned">已放弃</option>';
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

  // 自定义字段编辑
  startCustomFieldEdit(element: HTMLElement, fieldKey: string, fieldType: string, currentValue: any): void {
    const view = this.view;
    const valueSpan = element.querySelector('.al-custom-field-value');
    if (!valueSpan) return;

    const currentText = currentValue !== undefined && currentValue !== null && currentValue !== '' ? String(currentValue) : '';

    // 获取字段配置以获取选项
    const settings = view.plugin.getSettings();
    const fieldConfig = settings.customGoalFields?.find(f => f.key === fieldKey);
    const options = fieldConfig?.options?.split(',').map(o => o.trim()) || [];

    let inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    if (fieldType === 'select' && options.length > 0) {
      inputEl = document.createElement('select');
      inputEl.className = 'al-field-edit-select';
      inputEl.style.cssText = 'padding:6px 10px;border:1px solid var(--interactive-accent);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px;';
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

  // 添加自定义字段弹窗
  showAddCustomFieldModal(): void {
    const view = this.view;
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box" style="max-width:400px;">
        <div class="al-modal-header">
          <span>添加自定义字段</span>
          <button class="al-modal-close">&times;</button>
        </div>
        <div style="padding:20px;">
          <div class="al-form-item">
            <label>字段名称</label>
            <input type="text" id="al-custom-field-key" placeholder="输入字段名称（如：备注、标签）" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
          <div class="al-form-item">
            <label>显示标签</label>
            <input type="text" id="al-custom-field-label" placeholder="输入显示名称" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
          <div class="al-form-item">
            <label>字段类型</label>
            <select id="al-custom-field-type" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;">
              <option value="text">文本</option>
              <option value="number">数字</option>
              <option value="date">日期</option>
              <option value="select">单选</option>
            </select>
          </div>
          <div class="al-form-item" id="al-custom-field-options-row" style="display:none;">
            <label>选项（逗号分隔）</label>
            <input type="text" id="al-custom-field-options" placeholder="如：重要,普通,紧急" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
          <div class="al-form-item">
            <label>字段值（可选）</label>
            <input type="text" id="al-custom-field-value" placeholder="输入字段值" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
        </div>
        <div class="al-modal-footer">
          <button class="al-btn-secondary" id="al-custom-field-cancel" style="padding:8px 16px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);cursor:pointer;">取消</button>
          <button class="mod-cta" id="al-custom-field-save" style="padding:8px 16px;border:none;border-radius:6px;background:var(--interactive-accent);color:#fff;cursor:pointer;">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const keyInput = modal.querySelector('#al-custom-field-key') as HTMLInputElement;
    const labelInput = modal.querySelector('#al-custom-field-label') as HTMLInputElement;
    const typeSelect = modal.querySelector('#al-custom-field-type') as HTMLSelectElement;
    const optionsRow = modal.querySelector('#al-custom-field-options-row') as HTMLElement;
    const optionsInput = modal.querySelector('#al-custom-field-options') as HTMLInputElement;
    const valueInput = modal.querySelector('#al-custom-field-value') as HTMLInputElement;

    // 类型选择时显示/隐藏选项输入框
    typeSelect.addEventListener('change', () => {
      optionsRow.style.display = typeSelect.value === 'select' ? 'block' : 'none';
    });

    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-custom-field-cancel')?.addEventListener('click', close);

    modal.querySelector('#al-custom-field-save')?.addEventListener('click', async () => {
      const fieldKey = keyInput.value.trim();
      const fieldLabel = labelInput.value.trim() || fieldKey;
      const fieldType = typeSelect.value;
      const fieldOptions = typeSelect.value === 'select' ? optionsInput.value.trim() : '';
      const fieldValue = valueInput.value.trim();

      if (!fieldKey) {
        new Notice('请输入字段名称');
        return;
      }

      // 检查是否已存在
      const settings = view.plugin.getSettings();
      const existingFields = settings.customGoalFields || [];
      if (existingFields.some(f => f.key === fieldKey)) {
        new Notice('该字段已存在');
        return;
      }

      // 添加到设置
      const newField: CustomFieldConfig = {
        key: fieldKey,
        label: fieldLabel,
        type: fieldType as 'text' | 'number' | 'date' | 'select',
        options: fieldOptions,
        showInViews: ['gallery', 'list', 'board']
      };

      existingFields.push(newField);
      settings.customGoalFields = existingFields;
      await view.plugin.saveSettings();

      // 如果有值，更新目标
      if (fieldValue && view.selectedGoalId) {
        const updateData: Record<string, any> = {};
        updateData[fieldKey] = fieldValue;
        await view.plugin.getGoalManager().updateGoal(view.selectedGoalId, updateData);
      }

      new Notice('自定义字段已添加');
      close();
      view.loadAndRender();
    });

    keyInput.focus();
  }
}

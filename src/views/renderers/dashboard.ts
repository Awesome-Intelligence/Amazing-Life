/**
 * Dashboard View - Dashboard & List Renderer
 *
 * 从 DashboardView 类中抽出的仪表盘与列表视图渲染逻辑：
 * - renderDashboardView：仪表盘首页（日历 + 今日任务 + 逾期任务）
 * - renderListView：列表视图（Markdown 表格形式）
 * - renderTasks / renderTaskFields 辅助
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import type { DashboardView } from '../DashboardView';
import { Goal, Task, TaskField, STATUS_NAMES } from '../../types';
import type { DashboardTaskMode } from '../view-types';

export class DashboardRenderer {
  constructor(private view: DashboardView) {}

  renderDashboardView(todayTasks: Task[], overdueTasks: Task[], importantTasks: Task[], taskMode: DashboardTaskMode = 'overdue'): string {
    const calendarHtml = this.view.calendarRenderer.renderCalendar();
    const modeConfig: Record<DashboardTaskMode, { icon: string; label: string; count: number; countClass: string; emptyText: string }> = {
      important: { icon: '⭐', label: '重点任务', count: importantTasks.length, countClass: '', emptyText: '暂无重点任务' },
      today: { icon: '📋', label: '今日任务', count: todayTasks.length, countClass: '', emptyText: '暂无任务' },
      overdue: { icon: '⚠️', label: '逾期任务', count: overdueTasks.length, countClass: 'al-count-overdue', emptyText: '暂无逾期任务' }
    };
    const currentMode = modeConfig[taskMode];
    const currentTasks = taskMode === 'important' ? importantTasks : taskMode === 'today' ? todayTasks : overdueTasks;
    const modeOptions = (['important', 'today', 'overdue'] as DashboardTaskMode[]).map(mode => {
      const labels: Record<DashboardTaskMode, string> = { important: '重点任务', today: '今日任务', overdue: '逾期任务' };
      return `<option value="${mode}" ${taskMode === mode ? 'selected' : ''}>${labels[mode]}</option>`;
    }).join('');

    return `
      <div class="al-main-full">
        <div class="al-panel al-panel-calendar">
          <div class="al-panel-header"><span>📅</span><span>日历</span></div>
          <div class="al-panel-body al-calendar-body">${calendarHtml}</div>
        </div>
        <div class="al-panel">
          <div class="al-panel-header"><span>📋</span><span>今日任务</span><span class="al-panel-count">${todayTasks.length}</span></div>
          <div class="al-panel-body">${todayTasks.length === 0 ? this.view.detailRenderer.renderEmpty('📋', '暂无任务', '点击右上角按钮添加任务') : this.renderTasks(todayTasks)}</div>
        </div>
        <div class="al-panel ${taskMode === 'overdue' ? 'al-panel-overdue' : ''}">
          <div class="al-panel-header">
            <span>${currentMode.icon}</span>
            <span>${currentMode.label}</span>
            <span class="al-panel-count ${currentMode.countClass}">${currentMode.count}</span>
            <select id="al-dashboard-task-mode" class="al-panel-mode-select" aria-label="切换任务面板">
              ${modeOptions}
            </select>
          </div>
          <div class="al-panel-body">${currentTasks.length === 0 ? this.view.detailRenderer.renderEmpty(currentMode.icon, currentMode.emptyText, '') : this.renderTasks(currentTasks)}</div>
        </div>
      </div>
    `;
  }

  renderListView(allGoals: Goal[], allTasks: Task[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const fields = this.view.getGoalFields();
    const customFields = this.view.getEnabledCustomFields();
    const showLevel = fields.includes('level');
    const showStatus = fields.includes('status');
    const showProgress = fields.includes('progress');
    const showDue = fields.includes('due');
    const showTasksCount = fields.includes('tasksCount');

    if (allGoals.length === 0) return `<div class="al-table-view"><div class="al-table-empty">${this.view.detailRenderer.renderEmpty('🎯', '暂无目标', '')}</div><div class="al-add-goal-link" id="al-list-add-goal">+ 添加目标</div></div>`;

    // 构建 Markdown 表格头
    const headerCells: string[] = ['目标名称'];
    if (showLevel) headerCells.push('层级');
    if (showStatus) headerCells.push('状态');
    if (showProgress) headerCells.push('进度');
    if (showDue) headerCells.push('截止日期');
    if (showTasksCount) headerCells.push('任务');
    customFields.forEach(field => headerCells.push(field.label));

    const headerRow = '| ' + headerCells.join(' | ') + ' |';
    const separatorRow = '| ' + headerCells.map(() => '---').join(' | ') + ' |';

    // 构建数据行
    const rows = allGoals.map(goal => {
      const tasks = allTasks.filter(t => t['A-goal'] === goal['A-id']);
      const completedCount = tasks.filter(t => t['A-status'] === 'completed').length;

      const cells: string[] = [goal['A-title']];
      if (showLevel) cells.push(levelNames[goal['A-level']]);
      if (showStatus) cells.push(statusNames[goal['A-status']]);
      if (showProgress) cells.push(`${goal['A-progress']}%`);
      if (showDue) cells.push(goal['A-due'] || '-');
      if (showTasksCount) cells.push(`${tasks.length} (${completedCount})`);

      // 自定义字段值
      customFields.forEach(field => {
        const value = goal[field.key];
        cells.push(this.view.formatCustomFieldValue(value, field.type));
      });

      return '| ' + cells.join(' | ') + ' |';
    });

    const tableMarkdown = headerRow + '\n' + separatorRow + '\n' + rows.join('\n');
    const goalIds = allGoals.map(g => g['A-id']).join(',');

    return `<div class="al-table-view"><div class="al-markdown-table-wrapper"><div class="al-markdown-placeholder" data-markdown="${encodeURIComponent(tableMarkdown)}" data-goal-ids="${goalIds}"></div></div><div class="al-add-goal-link" id="al-list-add-goal">+ 添加目标</div></div>`;
  }

  // 渲染任务列表（仅用于仪表盘今日任务/逾期任务面板）- 使用目标详情页的块样式
  renderTasks(tasks: Task[]): string {
    const priorityColors = ['var(--text-red)', 'var(--text-orange)', 'var(--text-yellow)', 'var(--text-green)', 'var(--text-muted)'];
    return tasks.slice(0, 10).map(task => `
      <div class="al-task-item al-dashboard-task-item" data-task-id="${task['A-id']}">
        <input type="checkbox" class="task-list-item-checkbox" data-status="${task['A-status']}" ${task['A-status'] === 'completed' ? 'checked' : ''} data-task-id="${task['A-id']}">
        <div class="al-task-title ${task['A-status'] === 'completed' ? 'done' : task['A-status'] === 'cancelled' ? 'cancelled' : ''}">${task['A-title']}</div>
        ${task['A-status'] === 'in-progress' || task['A-status'] === 'cancelled' ? `<span class="al-task-status status-${task['A-status']}">${STATUS_NAMES[task['A-status']]}</span>` : ''}
        <div class="al-task-priority" style="color: ${priorityColors[task['A-priority'] - 1]}">${['🔴', '🟠', '🟡', '🟢', '⚪'][task['A-priority'] - 1]}</div>
      </div>
    `).join('');
  }
}

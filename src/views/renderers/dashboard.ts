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
import { Goal, Task, TaskField } from '../../types';

export class DashboardRenderer {
  constructor(private view: DashboardView) {}

  renderDashboardView(todayTasks: Task[], overdueTasks: Task[], weekComplete: number, activeTasks: number): string {
    const calendarHtml = this.view.calendarRenderer.renderCalendar();
    return `
      <div class="al-main-full">
        <div class="al-panel al-panel-calendar">
          <div class="al-panel-header"><span>📅</span><span>日历</span></div>
          <div class="al-panel-body al-calendar-body">${calendarHtml}</div>
        </div>
        <div class="al-stats">
          <div class="al-stat"><span class="al-stat-num">${todayTasks.length}</span><span class="al-stat-label">今日待办</span></div>
          <div class="al-stat"><span class="al-stat-num">${weekComplete}</span><span class="al-stat-label">本周完成</span></div>
          <div class="al-stat ${overdueTasks.length > 0 ? 'al-stat-warning' : ''}"><span class="al-stat-num">${overdueTasks.length}</span><span class="al-stat-label">逾期任务</span></div>
          <div class="al-stat"><span class="al-stat-num">${activeTasks}</span><span class="al-stat-label">进行中</span></div>
        </div>
        <div class="al-panel">
          <div class="al-panel-header"><span>📋</span><span>今日任务</span><span class="al-panel-count">${todayTasks.length}</span></div>
          <div class="al-panel-body">${todayTasks.length === 0 ? this.view.detailRenderer.renderEmpty('📋', '暂无任务', '点击右上角按钮添加任务') : this.renderTasks(todayTasks)}</div>
        </div>
        ${overdueTasks.length > 0 ? `<div class="al-panel al-panel-overdue"><div class="al-panel-header"><span>⚠️</span><span>逾期任务</span><span class="al-panel-count al-count-overdue">${overdueTasks.length}</span></div><div class="al-panel-body">${this.renderTasks(overdueTasks)}</div></div>` : ''}
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
        <input type="checkbox" class="task-list-item-checkbox" ${task['A-status'] === 'completed' ? 'checked' : ''} data-task-id="${task['A-id']}">
        <div class="al-task-title ${task['A-status'] === 'completed' ? 'done' : ''}">${task['A-title']}</div>
        <div class="al-task-priority" style="color: ${priorityColors[task['A-priority'] - 1]}">${['🔴', '🟠', '🟡', '🟢', '⚪'][task['A-priority'] - 1]}</div>
      </div>
    `).join('');
  }
}

/**
 * Dashboard View - Detail Renderer
 *
 * 从 DashboardView 类中抽出的目标详情与任务详情渲染逻辑：
 * - renderGoalDetailView：目标详情页
 * - renderTaskDetailView：任务详情页
 * - renderGoalFields / renderTaskFields：字段渲染辅助
 * - renderEmpty：空状态渲染（被其它 renderer 复用）
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import type { DashboardView } from '../DashboardView';
import { Goal, Task, GoalField, TaskField } from '../../types';

export class DetailRenderer {
  constructor(private view: DashboardView) {}

  renderGoalDetailView(goalId: string): string {
    const goal = this.view.getGoal(goalId);
    if (!goal) return `<div class="al-detail-view"><div class="al-empty">${this.renderEmpty('❌', '目标不存在', '')}</div></div>`;

    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: '#8B5CF6', 2: '#3B82F6', 3: '#6366F1', 4: '#22C55E' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const goalTasks = this.view.getTasksByGoal(goalId);
    const pendingTasks = goalTasks.filter(t => t['A-status'] === 'pending');
    const inProgressTasks = goalTasks.filter(t => t['A-status'] === 'in-progress');
    const completedTasks = goalTasks.filter(t => t['A-status'] === 'completed');
    const priorityNames = ['最高', '高', '中', '低', '最低'];
    const priorityColors = ['var(--text-red)', 'var(--text-orange)', 'var(--text-yellow)', 'var(--text-green)', 'var(--text-muted)'];

    const parentGoal = goal['A-parent'] ? this.view.getGoal(goal['A-parent']) : null;
    const coverImageUrl = this.view.getCoverImageUrl(goal['A-cover']);

    // 获取子目标
    const subGoals = this.view.plugin.getGoalManager().getAllGoals().filter(g => g['A-parent'] === goal['A-id']);

    // 获取自定义字段配置
    // 获取当前目标已有的自定义字段值
    const customFields = (this.view.plugin.getSettings().customGoalFields || []).filter(field => {
      return goal[field.key] !== undefined && goal[field.key] !== null && goal[field.key] !== '';
    });

    return `
      <div class="al-detail-view">
        <div class="al-detail-header">
          <div class="al-detail-icon" id="al-back-btn" title="返回">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </div>
          <div class="al-detail-title">
            <h2>${goal['A-title']}</h2>
          </div>
          <div class="al-detail-icon" id="al-goal-menu-btn" title="更多操作">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </div>
        </div>
        ${coverImageUrl ? `<div class="al-detail-cover"><img src="${coverImageUrl}" alt="封面图"></div>` : ''}
        <div class="al-detail-content">
          <div class="al-detail-main">
            ${!coverImageUrl ? `<div class="al-detail-add-cover">
              <span>🖼️</span>
              <span class="al-field-label">添加封面</span>
              <span>点击添加封面图片URL</span>
            </div>` : ''}
            <div class="al-detail-fields">
              <div class="al-field-row" data-field="level" data-value="${goal['A-level']}">
                <span class="al-field-icon">🎯</span>
                <span class="al-field-label">目标层级</span>
                <span class="al-field-value al-field-editable" data-field-type="select">${levelNames[goal['A-level']]}</span>
              </div>
              <div class="al-field-row al-parent-field-row" data-field="parent" data-value="${goal['A-parent'] || ''}">
                <span class="al-field-icon">🔗</span>
                <span class="al-field-label">上级目标</span>
                <span class="al-field-value al-parent-value ${parentGoal ? 'has-parent' : ''}" data-goal-id="${parentGoal ? parentGoal['A-id'] : ''}">${parentGoal ? parentGoal['A-title'] : '点击选择'}</span>
              </div>
            </div>
            <div class="al-detail-description-block" data-field="description" data-value="${goal['A-description'] || ''}">
              <div class="al-detail-description-header">
                <span class="al-detail-description-icon">📝</span>
                <span class="al-detail-description-title">目标描述</span>
              </div>
              <div class="al-detail-description-content al-field-editable" data-field-type="textarea">${goal['A-description'] || '添加描述...'}</div>
            </div>
            <div class="al-detail-custom-fields-block">
              <div class="al-detail-custom-fields-header" id="al-custom-fields-toggle">
                <span class="al-detail-custom-fields-icon">🔧</span>
                <span class="al-detail-custom-fields-title">自定义字段</span>
                <span class="al-detail-custom-fields-count" id="al-custom-fields-count">${customFields.length > 0 ? customFields.length : ''}</span>
              </div>
              <div class="al-detail-custom-fields-content" id="al-custom-fields-content">
                <div class="al-custom-fields-list">
                  ${customFields.length > 0 ? customFields.map(field => {
                    const value = goal[field.key];
                    const formattedValue = this.view.formatCustomFieldValue(value, field.type);
                    const hasValue = value !== undefined && value !== null && value !== '';
                    return `<div class="al-custom-field-item" data-field-key="${field.key}" data-field-type="${field.type}">
                      <span class="al-custom-field-label">${field.label}</span>
                      <span class="al-custom-field-value al-field-editable ${hasValue ? '' : 'empty'}">${hasValue ? formattedValue : '点击设置'}</span>
                    </div>`;
                  }).join('') : `<div class="al-custom-fields-empty">暂无自定义字段</div>`}
                </div>
                <div class="al-add-goal-link" id="al-add-custom-field-btn">+ 添加字段</div>
              </div>
            </div>
            <div class="al-progress-management-block">
              <div class="al-progress-management-header" id="al-progress-management-toggle">
                <span class="al-progress-management-icon">📊</span>
                <span class="al-progress-management-title">进度管理</span>
                <span class="al-progress-management-toggle-icon" id="al-progress-toggle-icon">▼</span>
              </div>
              <div class="al-progress-management-content" id="al-progress-management-content">
                <div class="al-progress-management-fields">
                  <div class="al-progress-field-row" data-field="status" data-value="${goal['A-status']}">
                    <span class="al-progress-field-label">目标状态</span>
                    <span class="al-progress-field-value al-field-editable" data-field-type="select">${statusNames[goal['A-status']]}</span>
                  </div>
                  <div class="al-progress-field-row" data-field="start" data-value="${goal['A-start']}">
                    <span class="al-progress-field-label">开始时间</span>
                    <span class="al-progress-field-value al-field-editable" data-field-type="date">${goal['A-start'] || '-'}</span>
                  </div>
                  <div class="al-progress-field-row" data-field="due" data-value="${goal['A-due'] || ''}">
                    <span class="al-progress-field-label">截止时间</span>
                    <span class="al-progress-field-value al-field-editable" data-field-type="date">${goal['A-due'] || '-'}</span>
                  </div>
                  <div class="al-progress-field-row" data-field="progress" data-value="${goal['A-progress']}">
                    <span class="al-progress-field-label">完成进度</span>
                    <div class="al-progress-field-value">
                      <div class="al-progress-slider-container">
                        <input type="range" class="al-progress-slider" min="0" max="100" value="${goal['A-progress']}" data-field="progress">
                        <span class="al-progress-value">${goal['A-progress']}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="al-subgoals-panel" id="al-subgoals-panel">
                  <div class="al-subgoals-panel-header" id="al-subgoals-toggle">
                    <span class="al-subgoals-toggle-icon" id="al-subgoals-toggle-icon">▶</span>
                    <span class="al-subgoals-panel-title">子目标</span>
                    <span class="al-subgoals-count">${subGoals.length}</span>
                  </div>
                  <div class="al-subgoals-panel-content" id="al-subgoals-content" style="display:none;">
                    ${subGoals.length > 0 ? `
                      <div class="al-subgoals-list">
                        ${subGoals.map(sub => `
                          <div class="al-subgoal-item" data-goal-id="${sub['A-id']}">
                            <span class="al-subgoal-level" style="background:${levelColors[sub['A-level']]}">${levelNames[sub['A-level']]}</span>
                            <span class="al-subgoal-title">${sub['A-title']}</span>
                            <div class="al-subgoal-progress">
                              <div class="al-progress-bar-small"><div class="al-progress-fill-small" style="width:${sub['A-progress']}%"></div></div>
                              <span>${sub['A-progress']}%</span>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    ` : `<div class="al-subgoals-empty">暂无子目标</div>`}
                    <div class="al-add-goal-link" id="al-add-subgoal-btn">+ 添加子目标</div>
                  </div>
                </div>
                <div class="al-tasks-panel" id="al-tasks-panel">
                  <div class="al-tasks-panel-header" id="al-tasks-toggle">
                    <span class="al-tasks-toggle-icon" id="al-tasks-toggle-icon">▶</span>
                    <span class="al-tasks-panel-title">关联任务</span>
                    <span class="al-tasks-count">${goalTasks.length}</span>
                    <span class="al-tasks-summary">${pendingTasks.length}待办 ${inProgressTasks.length}进行中 ${completedTasks.length}已完成</span>
                  </div>
                  <div class="al-tasks-panel-content" id="al-tasks-content" style="display:none;">
                    ${goalTasks.length === 0 ? `<div class="al-tasks-empty">暂无任务</div>` : `<div class="al-tasks-list">${goalTasks.map(task => `
                      <div class="al-task-item" data-task-id="${task['A-id']}">
                        <input type="checkbox" class="task-list-item-checkbox" ${task['A-status'] === 'completed' ? 'checked' : ''} data-task-id="${task['A-id']}">
                        <div class="al-task-title ${task['A-status'] === 'completed' ? 'done' : ''}">${task['A-title']}</div>
                        <div class="al-task-priority" style="color: ${priorityColors[task['A-priority'] - 1]}">${['🔴', '🟠', '🟡', '🟢', '⚪'][task['A-priority'] - 1]}</div>
                      </div>
                    `).join('')}</div>`}
                    <div class="al-add-goal-link" id="al-add-task-to-goal">+ 添加任务</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="al-detail-references-block" id="al-references-container">
              <div class="al-detail-references-header">
                <span class="al-detail-references-icon">📎</span>
                <span class="al-detail-references-title">引用记录</span>
                <span class="al-detail-references-count" id="al-references-count">0</span>
              </div>
              <div class="al-detail-references-content" id="al-references-content">
                <div class="al-detail-references-loading">加载中...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTaskDetailView(taskId: string): string {
    const task = this.view.getTask(taskId);
    if (!task) return `<div class="al-detail-view"><div class="al-empty">${this.renderEmpty('❌', '任务不存在', '')}</div></div>`;

    const goal = task['A-goal'] ? this.view.getGoal(task['A-goal']) : null;
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    const priorityNames = ['最高', '高', '中', '低', '最低'];
    const priorityColors = ['var(--text-red)', 'var(--text-orange)', 'var(--text-yellow)', 'var(--text-green)', 'var(--text-muted)'];
    const statusNames: Record<string, string> = { 'pending': '待办', 'in-progress': '进行中', 'completed': '已完成', 'cancelled': '已取消' };

    return `
      <div class="al-detail-view">
        <div class="al-detail-header">
          <div class="al-detail-icon" id="al-back-btn" title="返回">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </div>
          <div class="al-detail-title">
            <span style="color: ${priorityColors[task['A-priority'] - 1]}; font-size: 20px;">${['🔴', '🟠', '🟡', '🟢', '⚪'][task['A-priority'] - 1]}</span>
            <h2>${task['A-title']}</h2>
          </div>
          <div class="al-detail-status status-${task['A-status']}">${statusNames[task['A-status']]}</div>
        </div>
        <div class="al-detail-content">
          <div class="al-detail-main">
            <div class="al-detail-section">
              <h3>📊 任务信息</h3>
              <div class="al-detail-info-grid">
                <div class="al-detail-info-item"><span class="al-detail-info-label">优先级</span><span class="al-detail-info-value" style="color: ${priorityColors[task['A-priority'] - 1]}">${priorityNames[task['A-priority'] - 1]}</span></div>
                <div class="al-detail-info-item"><span class="al-detail-info-label">状态</span><span class="al-detail-info-value"><span class="al-status-badge status-${task['A-status']}">${statusNames[task['A-status']]}</span></span></div>
                <div class="al-detail-info-item"><span class="al-detail-info-label">创建时间</span><span class="al-detail-info-value">${task['A-created']}</span></div>
                ${task['A-due'] ? `<div class="al-detail-info-item"><span class="al-detail-info-label">截止日期</span><span class="al-detail-info-value">${task['A-due']}</span></div>` : ''}
                ${task['A-completed'] ? `<div class="al-detail-info-item"><span class="al-detail-info-label">完成时间</span><span class="al-detail-info-value">${task['A-completed']}</span></div>` : ''}
              </div>
            </div>

            <div class="al-detail-section">
              <h3>🎯 关联目标</h3>
              ${goal ? `
              <div class="al-task-goal-card" data-goal-id="${goal['A-id']}">
                <div class="al-task-goal-header">
                  <span class="al-goal-level" data-level="${goal['A-level']}" style="background: ${levelColors[goal['A-level']]}">${levelNames[goal['A-level']]}</span>
                  <span class="al-detail-info-label">${goal['A-title']}</span>
                </div>
                <div class="al-task-goal-progress">
                  <div class="al-progress-bar"><div class="al-progress-fill" style="width: ${goal['A-progress']}%"></div></div>
                  <span>${goal['A-progress']}%</span>
                </div>
              </div>
              ` : this.renderEmpty('🎯', '未关联目标', '')}
            </div>

            <div class="al-detail-section">
              <h3>⚡ 快捷操作</h3>
              <div class="al-task-actions">
                ${task['A-status'] === 'completed'
                  ? `<button class="al-action-btn" id="al-uncomplete-task"><span>↩️</span><span>标记为未完成</span></button>`
                  : `<button class="al-action-btn al-action-btn-success" id="al-complete-task"><span>✓</span><span>完成任务</span></button>`
                }
              </div>
            </div>

            <div class="al-detail-section">
              <h3>📜 引用记录</h3>
              <div class="al-detail-references-block" id="al-task-references-block">
                <div class="al-detail-references-header">
                  <span class="al-detail-references-icon">📄</span>
                  <span class="al-detail-references-title">日记引用</span>
                  <span class="al-detail-references-count" id="al-task-references-count">0</span>
                </div>
                <div class="al-detail-references-loading" id="al-task-references-loading">加载中...</div>
                <div class="al-detail-references-content" id="al-task-references-container"></div>
              </div>
            </div>
          </div>
          <div class="al-detail-sidebar">
            <div class="al-detail-actions">
              <button class="mod-cta" id="al-edit-task-btn"><span>✏️</span><span>编辑任务</span></button>
              <button class="al-action-btn-danger" id="al-delete-task-btn"><span>🗑️</span><span>删除任务</span></button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEmpty(icon: string, title: string, desc: string): string {
    return `<div class="al-empty"><span>${icon}</span><div>${title}</div><div class="al-empty-desc">${desc}</div></div>`;
  }

  // 注：renderGoalFields 在原文件中未被调用，保留以维持结构一致性
  renderGoalFields(goal: Goal, fields: GoalField[], allTasks: Task[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const goalTasks = allTasks.filter(t => t['A-goal'] === goal['A-id']);
    const completedCount = goalTasks.filter(t => t['A-status'] === 'completed').length;

    let html = '';
    if (fields.includes('level')) html += `<span class="al-goal-level" data-level="${goal['A-level']}">${levelNames[goal['A-level']]}</span>`;
    if (fields.includes('status')) html += `<span class="al-goal-status ${goal['A-status']}">${statusNames[goal['A-status']]}</span>`;
    if (fields.includes('title')) html += `<div class="al-goal-title">${goal['A-title']}</div>`;
    if (fields.includes('progress')) html += `<div class="al-goal-progress"><div class="al-progress-bar"><div class="al-progress-fill" style="width:${goal['A-progress']}%"></div></div><span>${goal['A-progress']}%</span></div>`;
    if (fields.includes('due') && goal['A-due']) html += `<div class="al-goal-due">📅 ${goal['A-due']}</div>`;
    if (fields.includes('tasksCount')) html += `<div class="al-goal-meta">📋 ${goalTasks.length} 个任务</div>`;
    if (fields.includes('completedTasksCount')) html += `<div class="al-goal-meta">✓ 已完成 ${completedCount} 个</div>`;

    return html;
  }

  renderTaskFields(task: Task, fields: TaskField[]): string {
    const priorityColors: Record<number, string> = { 1: '--text-red', 2: '--text-orange', 3: '--text-yellow', 4: '--text-green', 5: '--text-muted' };
    const statusNames: Record<string, string> = { 'pending': '待办', 'in-progress': '进行中', 'completed': '已完成', 'cancelled': '已取消' };

    let metaHtml = '';
    if (fields.includes('priority')) metaHtml += `<div class="al-field-row"><span class="al-field-label">优先级</span><span class="al-field-value" style="color:var(${priorityColors[task['A-priority']]})">${['最高','高','中','低','最低'][task['A-priority']-1]}</span></div>`;
    if (fields.includes('status')) metaHtml += `<div class="al-field-row"><span class="al-field-label">状态</span><span class="al-status-badge status-${task['A-status']}">${statusNames[task['A-status']]}</span></div>`;
    if (fields.includes('due') && task['A-due']) metaHtml += `<div class="al-field-row"><span class="al-field-label">截止</span><span class="al-task-due">${task['A-due']}</span></div>`;
    if (fields.includes('goal')) metaHtml += `<div class="al-field-row"><span class="al-field-label">目标</span><span class="al-goal-tag">${this.view.getGoalTitle(task['A-goal'])}</span></div>`;
    if (fields.includes('tags') && task['A-tags'].length > 0) metaHtml += `<div class="al-field-row"><span class="al-field-label">标签</span><span>${task['A-tags'].map(t => '#' + t).join(' ')}</span></div>`;

    let titleHtml = '';
    if (fields.includes('title')) titleHtml = `<div class="al-task-title ${task['A-status']==='completed'?'done':''}">${task['A-title']}</div>`;

    return `${titleHtml}${metaHtml ? `<div class="al-task-meta">${metaHtml}</div>` : ''}`;
  }
}

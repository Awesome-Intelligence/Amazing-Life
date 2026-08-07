/**
 * Dashboard View - Event Manager
 *
 * 从 DashboardView.ts 抽出的事件绑定与引用加载逻辑：
 * - bindEvents：渲染后挂载全部 DOM 事件（标签页、筛选、详情、拖拽、任务勾选等）
 * - toggleTaskStatus：切换任务完成状态
 * - loadGoalReferences / loadTaskReferences：异步加载并渲染引用记录
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态与其它 helper。
 */

import { Notice, Menu, setIcon } from 'obsidian';
import type { DashboardView } from './DashboardView';
import type { DashboardTaskMode } from './view-types';
import { DeleteConfirmModal, CoverImagePickerModal } from './modals';
import { FilterLogic, FilterOperator, ViewType, GOAL_FILTER_FIELDS, FILTER_OPERATOR_LABELS } from '../types';

export class EventManager {
  constructor(private view: DashboardView) {}

  bindEvents(): void {
    const view = this.view;
    const content = view.contentEl;

    // 仪表盘「通讯录」面板：唯一一个添加联系人的入口
    content.querySelector('#al-dashboard-add-contact-btn')?.addEventListener('click', () => {
      view.modalHelper.showCreateContactModal();
    });
    content.querySelector('#al-dashboard-add-contact-link')?.addEventListener('click', () => {
      view.modalHelper.showCreateContactModal();
    });

    // 联系人卡片点击：仪表盘面板卡片统一跳转详情页
    content.querySelectorAll<HTMLElement>('[data-contact-id]').forEach(node => {
      node.addClass('al-interactive');
      node.addEventListener('click', () => {
        const id = node.getAttribute('data-contact-id');
        if (id) view.navigateTo('contact-detail', null, null, id);
      });
    });
    content.querySelector('#al-contact-back-btn')?.addEventListener('click', () => {
      view.goBack();
    });
    const handleMark = async () => {
      if (!view.selectedContactId) return;
      try {
        await view.plugin.getContactManager().recordInteraction(view.selectedContactId);
        new Notice('已记录为今天联系');
        view.loadAndRender();
      } catch (err) {
        new Notice('记录失败: ' + (err as Error).message);
      }
    };
    const handleDelete = () => { if (view.selectedContactId) view.modalHelper.showDeleteContactModal(view.selectedContactId); };
    content.querySelector('#al-contact-mark-btn')?.addEventListener('click', handleMark);
    content.querySelector('#al-contact-delete-btn')?.addEventListener('click', handleDelete);

    // Calendar events
    view.calendarRenderer.bindCalendarEvents(content);

    // 仪表盘任务面板切换
    content.querySelector('#al-dashboard-task-mode')?.addEventListener('change', (e) => {
      view.dashboardTaskMode = (e.target as HTMLSelectElement).value as DashboardTaskMode;
      view.render();
    });

    // 仪表盘标签点击（固定的）
    content.querySelectorAll('.al-view-tab[data-view]').forEach(tab => {
      tab.addEventListener('click', () => {
        const viewType = (tab as HTMLElement).getAttribute('data-view') as ViewType;
        if (viewType === 'dashboard' && view.currentView !== 'dashboard') {
          view.currentView = 'dashboard';
          view.selectedGoalId = null;
          view.selectedTaskId = null;
          view.render();
        }
      });
    });

    // 标签页点击事件
    content.querySelectorAll('.al-view-tab[data-tab-id]').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = (tab as HTMLElement).getAttribute('data-tab-id');
        if (tabId) {
          view.switchTab(tabId);
        }
      });
    });

    // 标签页右键菜单（桌面端）和长按菜单（移动端）
    content.querySelectorAll('.al-view-tab[data-tab-id]').forEach(tabEl => {
      // 右键菜单
      tabEl.addEventListener('contextmenu', (e: Event) => {
        const tabId = (tabEl as HTMLElement).getAttribute('data-tab-id');
        if (tabId) {
          const nameEl = tabEl.querySelector('.al-tab-name') as HTMLElement;
          view.showTabContextMenu(nameEl || (tabEl as HTMLElement), tabId, e as MouseEvent);
        }
      });

      // 长按弹出菜单（移动端）
      let longPressTimer: number | null = null;
      tabEl.addEventListener('touchstart', (e) => {
        longPressTimer = window.setTimeout(() => {
          const tabId = (tabEl as HTMLElement).getAttribute('data-tab-id');
          if (tabId) {
            const nameEl = tabEl.querySelector('.al-tab-name') as HTMLElement;
            view.showTabContextMenu(nameEl || (tabEl as HTMLElement), tabId);
          }
        }, 500);
      });

      tabEl.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

      tabEl.addEventListener('touchcancel', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
    });

    // 添加视图按钮 - 显示下拉菜单
    content.querySelector('#al-add-view-tab')?.addEventListener('click', (e) => {
      e.stopPropagation();
      view.modalHelper.showAddViewDropdown(e as MouseEvent);
    });

    // 看板/画廊分组选择
    content.querySelector('#al-board-group-by')?.addEventListener('change', (e) => {
      const groupByValue = (e.target as HTMLSelectElement).value;
      const groupBy = groupByValue === '' ? null : groupByValue;
      view.updateActiveTabGroupBy(groupBy);
      view.render();
    });

    // 返回按钮 - 返回上一页
    content.querySelector('#al-back-btn')?.addEventListener('click', () => { view.goBack(); });

    // 目标更多操作菜单 - 使用 Obsidian 原生 Menu
    const menuBtn = content.querySelector('#al-goal-menu-btn');

    content.querySelector('#al-goal-star-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!view.selectedGoalId) return;
      const goal = view.getGoal(view.selectedGoalId);
      if (!goal) return;
      try {
        await view.plugin.getGoalManager().updateGoal(view.selectedGoalId, { starred: !goal['A-starred'] });
        new Notice(goal['A-starred'] ? '已取消重点标记' : '已标记为重点目标');
        view.loadAndRender();
      } catch (error) {
        new Notice('更新重点标记失败: ' + (error as Error).message);
      }
    });

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = new Menu();
      menu.setUseNativeMenu(true);

      menu.addItem((item) => {
        item.setTitle('打开目标文件')
          .setIcon('file-text')
          .onClick(async () => {
            if (view.selectedGoalId) {
              try {
                const file = await view.plugin.getGoalManager().getGoalFile(view.selectedGoalId);
                if (file) {
                  await view.plugin.app.workspace.getLeaf(true).openFile(file);
                } else {
                  new Notice('未找到目标文件');
                }
              } catch (error) {
                new Notice('打开文件失败');
              }
            }
          });
      });

      menu.addItem((item) => {
        item.setTitle('刷新目标')
          .setIcon('refresh-cw')
          .onClick(async () => {
            if (view.selectedGoalId) {
              await view.plugin.getGoalManager().loadGoals();
              new Notice('已刷新目标');
              view.loadAndRender();
            }
          });
      });

      menu.addItem((item) => {
        item.setTitle('删除目标')
          .setIcon('trash-2')
          .onClick(() => {
            if (view.selectedGoalId) {
              const goal = view.getGoal(view.selectedGoalId);
              if (goal) {
                const subGoals = view.plugin.getGoalManager().getAllGoals().filter(g => g['A-parent'] === view.selectedGoalId);

                if (subGoals.length > 0) {
                  view.modalHelper.showDeleteGoalWithChildrenModal(goal, subGoals);
                } else {
                  new DeleteConfirmModal(view.plugin, goal['A-title'], () => {
                    view.plugin.getGoalManager().deleteGoal(view.selectedGoalId!).then(() => {
                      new Notice('目标已删除');
                      view.goBack();
                    }).catch(() => {
                      new Notice('删除目标失败');
                    });
                  }).open();
                }
              }
            }
          });
      });

      menu.showAtPosition({ x: (e.target as HTMLElement).getBoundingClientRect().right, y: (e.target as HTMLElement).getBoundingClientRect().bottom + 4 });
    });

    // Goal click events - 记录历史
    content.querySelectorAll('.al-goal, .al-gallery-goal, .al-dashboard-goal-card').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { view.navigateTo('goal-detail', goalId, null); } }); });

    // Task click events (in detail views) - 记录历史
    content.querySelectorAll('.al-detail-task').forEach(el => { el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('.task-list-item-checkbox')) { return; } const taskId = (e.currentTarget as HTMLElement).getAttribute('data-task-id'); if (taskId) { view.modalHelper.showTaskDetailModal(taskId); } }); });

    // Task goal card click
    content.querySelectorAll('.al-task-goal-card').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { view.navigateTo('goal-detail', goalId, null); } }); });

    content.querySelector('#al-add-task-to-goal')?.addEventListener('click', () => { if (view.selectedGoalId) view.modalHelper.showCreateTaskModalForGoal(view.selectedGoalId); });

    // 封面图片点击事件
    content.querySelectorAll('.al-detail-add-cover, .al-detail-cover').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (view.selectedGoalId) {
          const goal = view.getGoal(view.selectedGoalId);
          if (goal) {
            const goalId = view.selectedGoalId;
            new CoverImagePickerModal(
              view.plugin,
              goalId,
              goal['A-cover'],
              async (imagePath) => {
                await view.plugin.getGoalManager().updateGoal(goalId, { cover: imagePath });
                view.loadAndRender();
              },
              async () => {
                await view.plugin.getGoalManager().updateGoal(goalId, { cover: null });
                view.loadAndRender();
              }
            ).open();
          }
        }
      });
    });

    // 字段行内编辑事件（目标 / 联系人共用 click 委托）
    content.querySelectorAll('.al-field-row[data-field], .al-progress-field-row[data-field], .al-detail-description-block[data-field]').forEach(row => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('al-field-link')) return;
        const field = row.getAttribute('data-field');
        const value = row.getAttribute('data-value');
        const fieldType = row.querySelector('.al-field-editable')?.getAttribute('data-field-type');
        if (!field || !fieldType) return;
        if (view.currentView === 'contact-detail' && view.selectedContactId) {
          // 联系人详情页：使用 startContactFieldEdit 走 ContactManager
          view.modalHelper.startContactFieldEdit(row as HTMLElement, field, fieldType, value || '');
        } else if (field !== 'cover' && field !== 'parent' && view.selectedGoalId) {
          view.modalHelper.startFieldEdit(row as HTMLElement, field, fieldType, value || '');
        }
      });
    });

    // 上级目标点击 - 选择父目标
    content.querySelector('.al-parent-field-row')?.addEventListener('click', () => {
      view.modalHelper.showParentSelectorModal();
    });



    // 子目标折叠面板折叠/展开
    content.querySelector('#al-subgoals-toggle')?.addEventListener('click', () => {
      const innerContent = document.querySelector('#al-subgoals-content') as HTMLElement;
      const toggleIcon = document.querySelector('#al-subgoals-toggle-icon') as HTMLElement;
      if (innerContent) {
        if (innerContent.classList.contains('al-hidden')) {
          innerContent.classList.remove('al-hidden');
          toggleIcon.classList.add('expanded');
        } else {
          innerContent.classList.add('al-hidden');
          toggleIcon.classList.remove('expanded');
        }
      }
    });

    // 子目标点击 - 跳转到子目标详情
    content.querySelectorAll('.al-subgoal-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id');
        if (goalId) view.navigateTo('goal-detail', goalId, null);
      });
    });

    // 添加子目标按钮
    content.querySelector('#al-add-subgoal-btn')?.addEventListener('click', () => {
      if (view.selectedGoalId) {
        view.modalHelper.showCreateGoalModal({ parent: view.selectedGoalId });
      }
    });

    // 关联任务折叠面板折叠/展开
    content.querySelector('#al-tasks-toggle')?.addEventListener('click', () => {
      const innerContent = document.querySelector('#al-tasks-content') as HTMLElement;
      const toggleIcon = document.querySelector('#al-tasks-toggle-icon') as HTMLElement;
      if (innerContent) {
        if (innerContent.classList.contains('al-hidden')) {
          innerContent.classList.remove('al-hidden');
          toggleIcon.classList.add('expanded');
        } else {
          innerContent.classList.add('al-hidden');
          toggleIcon.classList.remove('expanded');
        }
      }
    });

    // 任务点击事件
    content.querySelectorAll('.al-task-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('task-list-item-checkbox')) return;
        const taskId = (item as HTMLElement).getAttribute('data-task-id');
        if (taskId) view.modalHelper.showTaskDetailModal(taskId);
      });
    });

    // 自定义字段点击编辑事件
    content.querySelectorAll('.al-custom-field-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const fieldKey = el.getAttribute('data-field-key');
        const fieldType = el.getAttribute('data-field-type');
        if (fieldKey && view.selectedGoalId) {
          const goal = view.getGoal(view.selectedGoalId);
          const value = goal ? goal[fieldKey] : '';
          view.modalHelper.startCustomFieldEdit(el, fieldKey, fieldType || 'text', value);
        }
      });
    });

    // 添加自定义字段按钮
    content.querySelector('#al-add-custom-field-btn')?.addEventListener('click', () => {
      view.modalHelper.showAddCustomFieldModal();
    });

    // 上级目标点击事件
    content.querySelectorAll('.al-field-link[data-goal-id]').forEach(link => {
      link.addEventListener('click', (e) => {
        const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id');
        if (goalId) view.navigateTo('goal-detail', goalId, null);
      });
    });

    // 进度滑块事件
    content.querySelectorAll('.al-progress-slider[data-field="progress"]').forEach(slider => {
      const valueEl = slider.parentElement?.querySelector('.al-progress-value');
      slider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (valueEl) valueEl.textContent = `${value}%`;
      });
      slider.addEventListener('change', async (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (view.selectedGoalId) {
          try {
            await view.plugin.getGoalManager().updateGoal(view.selectedGoalId, { progress: value });
            new Notice('进度已更新');
            view.loadAndRender();
          } catch (error) {
            new Notice('更新失败: ' + (error as Error).message);
          }
        }
      });
    });

    // 列表视图添加按钮
    content.querySelector('#al-list-add-goal')?.addEventListener('click', () => view.modalHelper.showCreateGoalModal());

    // 画廊视图添加按钮（事件委托，处理分组和不分组的添加按钮）
    content.querySelectorAll('.al-gallery-add-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const prefillLevel = el.getAttribute('data-prefill-level');
        const prefillStatus = el.getAttribute('data-prefill-status');
        const prefillParent = el.getAttribute('data-prefill-parent');
        if (prefillParent) {
          view.modalHelper.showCreateGoalModal({ parent: prefillParent });
        } else if (prefillLevel) {
          view.modalHelper.showCreateGoalModal({ level: parseInt(prefillLevel) });
        } else if (prefillStatus) {
          view.modalHelper.showCreateGoalModal({ status: prefillStatus as 'active' | 'completed' | 'abandoned' });
        } else {
          view.modalHelper.showCreateGoalModal();
        }
      });
    });

    // 看板列添加按钮（事件委托）
    content.querySelectorAll('.al-add-goal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const prefillLevel = el.getAttribute('data-prefill-level');
        const prefillStatus = el.getAttribute('data-prefill-status');
        if (prefillLevel) {
          view.modalHelper.showCreateGoalModal({ level: parseInt(prefillLevel) });
        } else if (prefillStatus) {
          view.modalHelper.showCreateGoalModal({ status: prefillStatus });
        } else {
          view.modalHelper.showCreateGoalModal();
        }
      });
    });

    // ========== 筛选事件（新版） ==========
    
    // 点击 "添加筛选" 按钮（无条件时）
    content.querySelector('#al-add-filter-start')?.addEventListener('click', () => {
      view.tempShowFilterBuilder = true;
      view.tempFilterEditingId = null;
      view.tempFilterModified = true;
      view.tempFilterConditions.push({
        id: view.generateFilterId(),
        field: 'A-title',
        operator: 'contains',
        value: ''
      });
      view.tempFilterEditingId = view.tempFilterConditions[0].id;
      view.render();
    });

    // 点击展开/收起筛选条件栏（有条件时的主按钮）
    content.querySelector('#al-toggle-filter-bar')?.addEventListener('click', () => {
      view.tempShowFilterBuilder = !view.tempShowFilterBuilder;
      view.tempFilterEditingId = null;
      view.render();
    });

    // 点击行内添加条件按钮
    content.querySelector('#al-add-filter-condition-inline')?.addEventListener('click', () => {
      view.tempShowFilterBuilder = true;
      view.tempFilterConditions.push({
        id: view.generateFilterId(),
        field: 'A-title',
        operator: 'contains',
        value: ''
      });
      view.tempFilterEditingId = view.tempFilterConditions[view.tempFilterConditions.length - 1].id;
      view.tempFilterModified = true;
      view.render();
    });

    // 保存按钮
    content.querySelector('#al-filter-save')?.addEventListener('click', () => {
      view.updateActiveTabFilters(view.tempFilterConditions, view.tempFilterLogic);
      view.tempFilterModified = false;
      view.tempFilterEditingId = null;
      view.tempShowFilterBuilder = false;
      view.render();
      new Notice('筛选条件已保存');
    });

    // 清除按钮（撤销修改）
    content.querySelector('#al-filter-clear')?.addEventListener('click', () => {
      const currentFilters = view.getCurrentFilters();
      view.tempFilterConditions = [...currentFilters.conditions];
      view.tempFilterLogic = currentFilters.logic;
      view.tempFilterModified = false;
      view.tempFilterEditingId = null;
      view.tempShowFilterBuilder = false;
      view.render();
    });

    // 在筛选构建器中添加条件
    content.querySelector('#al-add-filter-condition')?.addEventListener('click', () => {
      view.tempFilterConditions.push({
        id: view.generateFilterId(),
        field: 'A-title',
        operator: 'contains',
        value: ''
      });
      view.tempFilterModified = true;
      view.tempFilterEditingId = view.tempFilterConditions[view.tempFilterConditions.length - 1].id;
      view.render();
    });

    // 条件逻辑切换
    content.querySelectorAll('.al-filter-logic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logic = (e.currentTarget as HTMLElement).getAttribute('data-logic') as FilterLogic;
        if (logic && logic !== view.tempFilterLogic) {
          view.tempFilterLogic = logic;
          view.tempFilterModified = true;
          view.render();
        }
      });
    });

    // 编辑条件按钮
    content.querySelectorAll('.al-filter-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).getAttribute('data-condition-id');
        if (conditionId) {
          view.tempFilterEditingId = conditionId;
          view.render();
        }
      });
    });

    // 删除条件
    content.querySelectorAll('.al-filter-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).getAttribute('data-condition-id');
        if (conditionId) {
          view.filterHelper.removeFilterCondition(conditionId);
        }
      });
    });

    // ========== 筛选条件编辑 - Obsidian 风格 Menu ==========
    
    // 字段选择按钮 - 弹出 Menu
    content.querySelectorAll('.al-filter-field-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const btnEl = e.currentTarget as HTMLElement;
        const conditionId = btnEl.getAttribute('data-condition-id');
        if (!conditionId) return;

        const menu = new Menu();
        menu.setUseNativeMenu(true);

        GOAL_FILTER_FIELDS.forEach(field => {
          menu.addItem((item) => {
            item.setTitle(field.label)
              .onClick(() => {
                view.filterHelper.updateFilterCondition(conditionId, { field: field.field });
                view.render();
              });
          });
        });

        const rect = btnEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
      });
    });

    // 操作符选择按钮 - 弹出 Menu
    content.querySelectorAll('.al-filter-operator-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const btnEl = e.currentTarget as HTMLElement;
        const conditionId = btnEl.getAttribute('data-condition-id');
        if (!conditionId) return;

        const condition = view.tempFilterConditions.find(c => c.id === conditionId);
        if (!condition) return;

        const fieldDef = GOAL_FILTER_FIELDS.find(f => f.field === condition.field);
        const fieldType = fieldDef?.type || 'string';
        const availableOperators = view.filterHelper.getOperatorsForFieldType(fieldType);

        const menu = new Menu();
        menu.setUseNativeMenu(true);

        availableOperators.forEach(op => {
          menu.addItem((item) => {
            item.setTitle(FILTER_OPERATOR_LABELS[op] || op)
              .onClick(() => {
                view.filterHelper.updateFilterCondition(conditionId, { operator: op });
                view.render();
              });
          });
        });

        const rect = btnEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
      });
    });

    // 值选择按钮 - 弹出 Menu (select 类型和 year 类型)
    content.querySelectorAll('.al-filter-value-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const btnEl = e.currentTarget as HTMLElement;
        const conditionId = btnEl.getAttribute('data-condition-id');
        const valueType = btnEl.getAttribute('data-value-type');
        if (!conditionId) return;

        const condition = view.tempFilterConditions.find(c => c.id === conditionId);
        if (!condition) return;

        const fieldDef = GOAL_FILTER_FIELDS.find(f => f.field === condition.field);

        const menu = new Menu();
        menu.setUseNativeMenu(true);

        if (valueType === 'select' && fieldDef?.options) {
          // select 类型 - 显示选项
          fieldDef.options.forEach(opt => {
            menu.addItem((item) => {
              item.setTitle(opt.label)
                .onClick(() => {
                  view.filterHelper.updateFilterCondition(conditionId, { value: opt.value });
                  view.render();
                });
            });
          });
        } else if (valueType === 'year') {
          // year 类型 - 显示年份列表
          const currentYear = new Date().getFullYear();
          for (let y = currentYear - 10; y <= currentYear + 10; y++) {
            const yearStr = String(y);
            menu.addItem((item) => {
              item.setTitle(`${y}年`)
                .onClick(() => {
                  view.filterHelper.updateFilterCondition(conditionId, { value: yearStr });
                  view.render();
                });
            });
          }
        }

        const rect = btnEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
      });
    });

    // 值输入变化（仅处理 input 类型）
    content.querySelectorAll('.al-filter-value-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).getAttribute('data-condition-id');
        if (conditionId) {
          const newValue = (e.target as HTMLInputElement).value;
          view.filterHelper.updateFilterCondition(conditionId, { value: newValue || null });
          view.render();
        }
      });
    });

    // Task actions
    content.querySelector('#al-complete-task')?.addEventListener('click', async () => { if (view.selectedTaskId) { await view.plugin.getTaskManager().completeTask(view.selectedTaskId); view.loadAndRender(); } });
    content.querySelector('#al-uncomplete-task')?.addEventListener('click', async () => { if (view.selectedTaskId) { await view.plugin.getTaskManager().updateTask(view.selectedTaskId, { status: 'pending' }); view.loadAndRender(); } });
    content.querySelector('#al-delete-task-btn')?.addEventListener('click', () => {
      if (!view.selectedTaskId) return;
      const task = view.plugin.getTaskManager().getTask(view.selectedTaskId);
      const taskTitle = task?.['A-title'] || '此任务';
      new DeleteConfirmModal(
        view.plugin,
        taskTitle,
        async () => {
          try {
            await view.plugin.getTaskManager().deleteTask(view.selectedTaskId!);
            new Notice('任务已删除');
            view.currentView = 'dashboard';
            view.selectedTaskId = null;
            view.loadAndRender();
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

    // Task checkbox clicks
    content.querySelectorAll('.task-list-item-checkbox[data-task-id]').forEach(checkbox => { checkbox.addEventListener('click', async (e) => { e.stopPropagation(); }); checkbox.addEventListener('change', async (e) => { e.stopPropagation(); const taskId = (e.target as HTMLInputElement).getAttribute('data-task-id'); if (taskId) { await this.toggleTaskStatus(taskId); } }); });

    // Field settings button
    content.querySelector('#al-open-field-settings')?.addEventListener('click', () => view.modalHelper.showFieldSettingsModal());

    // Board drag and drop
    view.boardRenderer.bindBoardDragEvents(content);
  }

  async toggleTaskStatus(taskId: string): Promise<void> {
    const view = this.view;
    const task = view.plugin.getTaskManager().getTask(taskId);
    if (!task) return;
    try { if (task['A-status'] === 'completed' || task['A-status'] === 'cancelled') { await view.plugin.getTaskManager().updateTask(taskId, { status: 'pending' }); } else { await view.plugin.getTaskManager().completeTask(taskId); } view.loadAndRender(); } catch (error) { new Notice('更新失败: ' + (error as Error).message); }
  }

  async loadGoalReferences(): Promise<void> {
    const view = this.view;
    if (view.currentView !== 'goal-detail' || !view.selectedGoalId) {
      return;
    }

    const container = view.contentEl.querySelector('#al-references-container');
    const contentEl = view.contentEl.querySelector('#al-references-content');
    const countEl = view.contentEl.querySelector('#al-references-count');

    if (!container || !contentEl || !countEl) {
      return;
    }

    try {
      const references = await view.plugin.getGoalManager().getGoalReferences(view.selectedGoalId);
      const goal = view.getGoal(view.selectedGoalId);
      const goalTitle = goal ? goal['A-title'] : '';

      countEl.textContent = references.length.toString();

      if (references.length === 0) {
        contentEl.empty();
        const emptyDiv = contentEl.createDiv('al-detail-references-empty');
        const emptySpan = emptyDiv.createSpan('al-empty-text');
        emptySpan.setText('暂无引用记录');
        return;
      }

      contentEl.empty();
      references.forEach(ref => {
        let lineContent = ref.lineContent;
        if (goalTitle) {
          lineContent = lineContent.replace(new RegExp(goalTitle, 'g'), `<span class="al-reference-highlight">${goalTitle}</span>`);
        }

        const itemDiv = contentEl.createDiv('al-detail-reference-item');
        itemDiv.setAttribute('data-file-path', ref.filePath);
        
        const fileInfoDiv = itemDiv.createDiv('al-reference-file-info');
        const iconSpan = fileInfoDiv.createSpan('al-reference-file-icon');
        iconSpan.setText('📄');
        const nameSpan = fileInfoDiv.createSpan('al-reference-file-name');
        nameSpan.setText(ref.fileName);
        const lineSpan = fileInfoDiv.createSpan('al-reference-line-number');
        lineSpan.setText(String(ref.lineNumber));
        
        const contentDiv = itemDiv.createDiv('al-reference-content');
        const tmp = document.createElement('div');
        tmp.innerHTML = lineContent;
        while (tmp.firstChild) contentDiv.appendChild(tmp.firstChild);

        itemDiv.addEventListener('click', () => {
          const file = view.plugin.app.vault.getAbstractFileByPath(ref.filePath);
          if (file) {
            view.plugin.app.workspace.openLinkText(file.path, '');
          }
        });
      });
    } catch (error) {
      console.error('加载引用记录失败:', error);
      contentEl.empty();
      const errorDiv = contentEl.createDiv('al-detail-references-error');
      errorDiv.setText('加载引用记录失败');
    }
  }

  async loadTaskReferences(): Promise<void> {
    const view = this.view;
    if (view.currentView !== 'task-detail' || !view.selectedTaskId) {
      return;
    }

    const loadingEl = view.contentEl.querySelector('#al-task-references-loading');
    const contentEl = view.contentEl.querySelector('#al-task-references-container');
    const countEl = view.contentEl.querySelector('#al-task-references-count');

    if (!loadingEl || !contentEl || !countEl) {
      return;
    }

    try {
      const references = await view.plugin.getTaskManager().getTaskReferences(view.selectedTaskId);
      const task = view.getTask(view.selectedTaskId);
      const taskTitle = task ? task['A-title'] : '';

      countEl.textContent = references.length.toString();
      loadingEl.remove();

      if (references.length === 0) {
        contentEl.empty();
        const emptyDiv = contentEl.createDiv('al-detail-references-empty');
        const emptySpan = emptyDiv.createSpan('al-empty-text');
        emptySpan.setText('暂无引用记录');
        return;
      }

      contentEl.empty();
      references.forEach(ref => {
        let lineContent = ref.lineContent;
        if (taskTitle) {
          lineContent = lineContent.replace(new RegExp(taskTitle, 'g'), `<span class="al-reference-highlight">${taskTitle}</span>`);
        }

        const itemDiv = contentEl.createDiv('al-detail-reference-item');
        itemDiv.setAttribute('data-file-path', ref.filePath);
        
        const fileInfoDiv = itemDiv.createDiv('al-reference-file-info');
        const iconSpan = fileInfoDiv.createSpan('al-reference-file-icon');
        iconSpan.setText('📄');
        const nameSpan = fileInfoDiv.createSpan('al-reference-file-name');
        nameSpan.setText(ref.fileName);
        const lineSpan = fileInfoDiv.createSpan('al-reference-line-number');
        lineSpan.setText(String(ref.lineNumber));
        
        const contentDiv = itemDiv.createDiv('al-reference-content');
        const tmp = document.createElement('div');
        tmp.innerHTML = lineContent;
        while (tmp.firstChild) contentDiv.appendChild(tmp.firstChild);

        itemDiv.addEventListener('click', () => {
          const file = view.plugin.app.vault.getAbstractFileByPath(ref.filePath);
          if (file) {
            view.plugin.app.workspace.openLinkText(file.path, '');
          }
        });
      });
    } catch (error) {
      console.error('加载引用记录失败:', error);
      loadingEl.remove();
      contentEl.empty();
      const errorDiv = contentEl.createDiv('al-detail-references-error');
      errorDiv.setText('加载引用记录失败');
    }
  }

  async loadContactInteractions(): Promise<void> {
    const view = this.view;
    if (view.currentView !== 'contact-detail' || !view.selectedContactId) {
      return;
    }
    const container = view.contentEl.querySelector('#al-contact-interactions-container');
    if (!container) return;
    try {
      const items = await view.plugin.getContactManager().getContactInteractions(view.selectedContactId);
      container.empty();
      const renderedContent = container.createDiv();
      const tmp = document.createElement('div');
      tmp.innerHTML = view.contactRenderer.renderContactInteractions(items);
      while (tmp.firstChild) renderedContent.appendChild(tmp.firstChild);
      renderedContent.querySelectorAll<HTMLElement>('.al-detail-reference-item').forEach(item => {
        item.addEventListener('click', () => {
          const filePath = item.getAttribute('data-file-path');
          if (filePath) {
            const file = view.plugin.app.vault.getAbstractFileByPath(filePath);
            if (file) {
              view.plugin.app.workspace.openLinkText(file.path, '');
            }
          }
        });
      });
    } catch (err) {
      container.empty();
      const errorDiv = container.createDiv('al-empty-text');
      errorDiv.setText('加载失败: ' + (err as Error).message);
    }
  }
}

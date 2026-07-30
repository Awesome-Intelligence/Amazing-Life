/**
 * Dashboard View - Calendar Renderer
 *
 * 从 DashboardView 类中抽出的日历渲染与事件绑定逻辑：
 * - renderCalendar：日历容器 + 模式切换
 * - renderDayView / renderWeekView / renderMonthView / renderYearView：各模式日历
 * - bindCalendarEvents：日历交互事件
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import type { DashboardView } from '../DashboardView';
import { CalendarViewMode } from '../view-types';

export class CalendarRenderer {
  constructor(private view: DashboardView) {}

  renderCalendar(): string {
    const modes: CalendarViewMode[] = ['day', 'week', 'month', 'year'];
    const modeLabels: Record<CalendarViewMode, string> = { day: '日', week: '周', month: '月', year: '年' };

    let content = '';

    switch (this.view.calendarMode) {
      case 'day':
        content = this.renderDayView(this.view.calendarDate);
        break;
      case 'week':
        content = this.renderWeekView(this.view.calendarDate);
        break;
      case 'month':
        content = this.renderMonthView(this.view.calendarDate);
        break;
      case 'year':
        content = this.renderYearView(this.view.calendarDate);
        break;
    }

    return `
      <div class="al-calendar-modes">
        ${modes.map(m => `<button class="al-calendar-mode-btn ${this.view.calendarMode === m ? 'active' : ''}" data-mode="${m}">${modeLabels[m]}</button>`).join('')}
      </div>
      <div class="al-calendar-content">${content}</div>
    `;
  }

  renderDayView(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let cells = '';
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(d => cells += `<div class="al-cal-day-header">${d}</div>`);

    for (let i = 0; i < startDay; i++) {
      cells += `<div class="al-cal-day empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = todayStr === dateStr;
      const isSelected = this.view.selectedDay === dateStr;
      const classes = ['al-cal-day'];
      if (isToday) classes.push('today');
      if (isSelected) classes.push('day-selected');
      cells += `<div class="${classes.join(' ')}" data-date="${dateStr}">${d}</div>`;
    }

    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-day">◀</button><span class="al-calendar-title">${year}年${month + 1}月</span><button class="al-calendar-next" id="al-cal-next-day">▶</button></div>
      <div class="al-cal-grid">${cells}</div>
    `;
  }

  renderWeekView(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let cells = '';
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(d => cells += `<div class="al-cal-day-header">${d}</div>`);

    for (let i = 0; i < startDay; i++) {
      cells += `<div class="al-cal-day empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const weekStart = new Date(dayDate);
      weekStart.setDate(dayDate.getDate() - dayDate.getDay());
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const isToday = todayStr === dateStr;
      const isSelected = this.view.selectedWeekStart === weekStartStr;
      const classes = ['al-cal-day'];
      if (isToday) classes.push('today');
      if (isSelected) classes.push('week-selected');
      cells += `<div class="${classes.join(' ')}" data-week-start="${weekStartStr}" data-date="${dateStr}">${d}</div>`;
    }

    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-week">◀</button><span class="al-calendar-title">${year}年${month + 1}月</span><button class="al-calendar-next" id="al-cal-next-week">▶</button></div>
      <div class="al-cal-grid">${cells}</div>
    `;
  }

  renderMonthView(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    let months = '';
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

    for (let m = 0; m < 12; m++) {
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;
      const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
      const isSelected = this.view.selectedMonth === monthKey;
      const classes = ['al-cal-month-item'];
      if (isCurrentMonth) classes.push('current');
      if (isSelected) classes.push('selected');
      months += `<div class="${classes.join(' ')}" data-year="${year}" data-month="${m + 1}" data-month-key="${monthKey}">${monthNames[m]}</div>`;
    }

    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-month">◀</button><span class="al-calendar-title">${year}年</span><button class="al-calendar-next" id="al-cal-next-month">▶</button></div>
      <div class="al-cal-month-grid">${months}</div>
    `;
  }

  renderYearView(date: Date): string {
    const year = date.getFullYear();
    const prevYear = year - 1;
    const nextYear = year + 1;
    const today = new Date();
    const isCurrentYear = today.getFullYear() === year;

    const prevYearSel = this.view.selectedYear === prevYear.toString();
    const currentYearSel = this.view.selectedYear === year.toString();
    const nextYearSel = this.view.selectedYear === nextYear.toString();

    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-year">◀</button><span class="al-calendar-title">选择年份</span><button class="al-calendar-next" id="al-cal-next-year">▶</button></div>
      <div class="al-cal-year-display">
        <div class="al-cal-year-item ${prevYearSel ? 'selected' : ''}" data-year="${prevYear}">${prevYear}</div>
        <div class="al-cal-year-item current ${isCurrentYear && !this.view.selectedYear ? '' : (currentYearSel ? 'selected' : '')}" data-year="${year}">${year}</div>
        <div class="al-cal-year-item ${nextYearSel ? 'selected' : ''}" data-year="${nextYear}">${nextYear}</div>
      </div>
    `;
  }

  bindCalendarEvents(content: HTMLElement): void {
    // 模式切换
    content.querySelectorAll('.al-calendar-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode') as CalendarViewMode;
        this.view.calendarMode = mode;
        this.view.render();
      });
    });

    // 上一个
    content.querySelector('#al-cal-prev-day')?.addEventListener('click', () => { this.view.calendarDate.setMonth(this.view.calendarDate.getMonth() - 1); this.view.selectedWeekStart = null; this.view.render(); });
    content.querySelector('#al-cal-prev-week')?.addEventListener('click', () => { this.view.calendarDate.setMonth(this.view.calendarDate.getMonth() - 1); this.view.selectedWeekStart = null; this.view.render(); });
    content.querySelector('#al-cal-prev-month')?.addEventListener('click', () => { this.view.calendarDate.setFullYear(this.view.calendarDate.getFullYear() - 1); this.view.selectedWeekStart = null; this.view.render(); });
    content.querySelector('#al-cal-prev-year')?.addEventListener('click', () => { this.view.calendarDate.setFullYear(this.view.calendarDate.getFullYear() - 1); this.view.selectedWeekStart = null; this.view.render(); });

    // 下一个
    content.querySelector('#al-cal-next-day')?.addEventListener('click', () => { this.view.calendarDate.setMonth(this.view.calendarDate.getMonth() + 1); this.view.selectedWeekStart = null; this.view.render(); });
    content.querySelector('#al-cal-next-week')?.addEventListener('click', () => { this.view.calendarDate.setMonth(this.view.calendarDate.getMonth() + 1); this.view.selectedWeekStart = null; this.view.render(); });
    content.querySelector('#al-cal-next-month')?.addEventListener('click', () => { this.view.calendarDate.setFullYear(this.view.calendarDate.getFullYear() + 1); this.view.selectedWeekStart = null; this.view.render(); });
    content.querySelector('#al-cal-next-year')?.addEventListener('click', () => { this.view.calendarDate.setFullYear(this.view.calendarDate.getFullYear() + 1); this.view.selectedWeekStart = null; this.view.render(); });

    // 日视图：点击日期打开日记（排除有 data-week-start 的元素）
    content.querySelectorAll('.al-cal-day:not(.empty):not([data-week-start])').forEach(day => {
      day.addEventListener('click', () => {
        const dateStr = day.getAttribute('data-date');
        if (dateStr) {
          this.view.selectedDay = dateStr;
          this.view.render();
          this.view.openDailyNote(dateStr);
        }
      });
    });

    // 周视图：点击选中整行并打开周记
    content.querySelectorAll('.al-cal-day[data-week-start]').forEach(day => {
      day.addEventListener('click', () => {
        const weekStart = day.getAttribute('data-week-start');
        if (weekStart) {
          this.view.selectedWeekStart = weekStart;
          // 重新渲染以显示选中效果
          this.view.render();
          this.view.openWeeklyNoteByDate(weekStart);
        }
      });
    });

    // 月视图：点击月份打开月记
    content.querySelectorAll('.al-cal-month-item').forEach(month => {
      month.addEventListener('click', () => {
        const yearNum = parseInt(month.getAttribute('data-year') || this.view.calendarDate.getFullYear().toString());
        const monthNum = parseInt(month.getAttribute('data-month') || '1');
        const yearMonth = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
        this.view.selectedMonth = yearMonth;
        this.view.render();
        this.view.openMonthlyNoteByDate(yearMonth);
      });
    });

    // 年视图：点击年份打开年记
    content.querySelectorAll('.al-cal-year-item').forEach(yearEl => {
      yearEl.addEventListener('click', () => {
        const yearNum = parseInt(yearEl.getAttribute('data-year') || this.view.calendarDate.getFullYear().toString());
        this.view.selectedYear = yearNum.toString();
        this.view.render();
        this.view.openYearlyNoteByDate(yearNum.toString());
      });
    });
  }
}

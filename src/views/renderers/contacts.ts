/**
 * Dashboard View - Contacts Renderer
 *
 * 联系人视图的渲染：列表/看板/画廊/详情
 * 全部使用 Obsidian 原生组件（Setting、metadata-property、mod-list），
 * 视觉与现有目标/任务模块保持一致。
 */

import type { DashboardView } from "../DashboardView";
import { ContactInteraction, CONTACT_PRIORITY_LABELS, CONTACT_STATUS_LABELS } from "../../types";

export class ContactRenderer {
  constructor(private view: DashboardView) {}

  renderContactDetailView(contactId: string): string {
    const c = this.view.plugin.getContactManager().getContact(contactId);
    if (!c) return this.view.detailRenderer.renderEmpty("❌", "联系人不存在", "");

    const statusText = CONTACT_STATUS_LABELS[c["A-status"] as keyof typeof CONTACT_STATUS_LABELS] || "-";
    const priorityText = CONTACT_PRIORITY_LABELS[c["A-priority"] as keyof typeof CONTACT_PRIORITY_LABELS] || "-";
    const tags = (c["A-tags"] || []).map((tag: string) => `#${tag}`).join(" ");

    const relations = this.view.plugin.getSettings().contactRelations || ["家人", "朋友", "同事", "客户", "导师", "同学", "邻居", "其他"];
    const genderText: Record<string, string> = { "": "未指定", "male": "男", "female": "女", "other": "其他" };
    const genderValue = genderText[c["A-gender"] as string] || "未指定";

    return `<div class="al-detail-view al-contact-detail-view">
        <div class="al-detail-header">
          <div class="al-detail-icon" id="al-contact-back-btn" title="返回">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </div>
          <div class="al-detail-title">
            <h2>${this.escapeHtml(c["A-title"])}${c["A-nickname"] ? " (" + this.escapeHtml(c["A-nickname"]) + ")" : ""}</h2>
          </div>
          <div class="al-detail-icon" id="al-contact-mark-btn" title="标记今天联系">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div class="al-detail-icon al-detail-delete-btn" id="al-contact-delete-btn" title="删除">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
          </div>
        </div>
        <div class="al-detail-content">
          <div class="al-detail-main">
            <div class="al-detail-description-block" data-field="A-description" data-value="${this.escapeHtml(c["A-description"] || "")}">
              <div class="al-detail-description-header">
                <span class="al-detail-description-icon">📝</span>
                <span class="al-detail-description-title">联系人备注</span>
              </div>
              <div class="al-detail-description-content al-field-editable" data-field-type="textarea">${c["A-description"] ? this.escapeHtml(c["A-description"]) : '<span style="color:var(--text-muted)">点击添加备注...</span>'}</div>
            </div>

            <div class="al-detail-fields">
              <div class="al-field-row" data-field="A-relation" data-value="${this.escapeHtml(c["A-relation"] || "")}">
                <span class="al-field-icon">👥</span>
                <span class="al-field-label">关系</span>
                <span class="al-field-value al-field-editable" data-field-type="select">${this.escapeHtml(c["A-relation"] || "其他")}</span>
              </div>
              <div class="al-field-row" data-field="A-priority" data-value="${c["A-priority"]}">
                <span class="al-field-icon">⭐</span>
                <span class="al-field-label">优先级</span>
                <span class="al-field-value al-field-editable" data-field-type="select">${priorityText}</span>
              </div>
              <div class="al-field-row" data-field="A-status" data-value="${this.escapeHtml(c["A-status"] || "active")}">
                <span class="al-field-icon">📌</span>
                <span class="al-field-label">状态</span>
                <span class="al-field-value al-field-editable" data-field-type="select">${statusText}</span>
              </div>
              <div class="al-field-row" data-field="A-gender" data-value="${this.escapeHtml(c["A-gender"] || "")}">
                <span class="al-field-icon">⚧</span>
                <span class="al-field-label">性别</span>
                <span class="al-field-value al-field-editable" data-field-type="select">${genderValue}</span>
              </div>
              <div class="al-field-row" data-field="A-birthday" data-value="${this.escapeHtml(c["A-birthday"] || "")}">
                <span class="al-field-icon">🎂</span>
                <span class="al-field-label">生日</span>
                <span class="al-field-value al-field-editable" data-field-type="date">${c["A-birthday"] || "点击设置"}</span>
              </div>
              <div class="al-field-row" data-field="A-remind-interval" data-value="${c["A-remind-interval"]}">
                <span class="al-field-icon">⏰</span>
                <span class="al-field-label">提醒间隔（天）</span>
                <span class="al-field-value al-field-editable" data-field-type="number">${c["A-remind-interval"]}</span>
              </div>
            </div>

            <div class="al-detail-section">
              <h3><span class="al-detail-section-icon">🏷️</span>话题标签</h3>
              <div class="al-detail-fields">
                <div class="al-field-row" data-field="A-tags" data-value="${(c["A-tags"] || []).join(",")}">
                  <span class="al-field-icon">#</span>
                  <span class="al-field-label">话题</span>
                  <span class="al-field-value al-field-editable" data-field-type="text">${tags || '<span style="color:var(--text-muted)">点击设置（逗号分隔）</span>'}</span>
                </div>
              </div>
            </div>

            <div class="al-detail-section">
              <h3><span class="al-detail-section-icon">📇</span>联系方式</h3>
              <div class="al-detail-fields">
                <div class="al-field-row" data-field="A-phone" data-value="${this.escapeHtml(c["A-phone"] || "")}">
                  <span class="al-field-icon">📞</span>
                  <span class="al-field-label">电话</span>
                  <span class="al-field-value al-field-editable" data-field-type="text">${c["A-phone"] ? this.escapeHtml(c["A-phone"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
                <div class="al-field-row" data-field="A-email" data-value="${this.escapeHtml(c["A-email"] || "")}">
                  <span class="al-field-icon">✉️</span>
                  <span class="al-field-label">邮箱</span>
                  <span class="al-field-value al-field-editable" data-field-type="text">${c["A-email"] ? this.escapeHtml(c["A-email"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
                <div class="al-field-row" data-field="A-wechat" data-value="${this.escapeHtml(c["A-wechat"] || "")}">
                  <span class="al-field-icon">💬</span>
                  <span class="al-field-label">微信</span>
                  <span class="al-field-value al-field-editable" data-field-type="text">${c["A-wechat"] ? this.escapeHtml(c["A-wechat"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
                <div class="al-field-row" data-field="A-company" data-value="${this.escapeHtml(c["A-company"] || "")}">
                  <span class="al-field-icon">🏢</span>
                  <span class="al-field-label">公司</span>
                  <span class="al-field-value al-field-editable" data-field-type="text">${c["A-company"] ? this.escapeHtml(c["A-company"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
                <div class="al-field-row" data-field="A-job-title" data-value="${this.escapeHtml(c["A-job-title"] || "")}">
                  <span class="al-field-icon">👔</span>
                  <span class="al-field-label">职位</span>
                  <span class="al-field-value al-field-editable" data-field-type="text">${c["A-job-title"] ? this.escapeHtml(c["A-job-title"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
              </div>
            </div>

            <div class="al-detail-section">
              <h3><span class="al-detail-section-icon">📅</span>关键日期</h3>
              <div class="al-detail-fields">
                <div class="al-field-row" data-field="A-met" data-value="${this.escapeHtml(c["A-met"] || "")}">
                  <span class="al-field-icon">🤝</span>
                  <span class="al-field-label">认识日期</span>
                  <span class="al-field-value al-field-editable" data-field-type="date">${c["A-met"] ? this.escapeHtml(c["A-met"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
                <div class="al-field-row" data-field="A-source" data-value="${this.escapeHtml(c["A-source"] || "")}">
                  <span class="al-field-icon">🧭</span>
                  <span class="al-field-label">认识途径</span>
                  <span class="al-field-value al-field-editable" data-field-type="text">${c["A-source"] ? this.escapeHtml(c["A-source"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
                <div class="al-field-row" data-field="A-last-contact" data-value="${this.escapeHtml(c["A-last-contact"] || "")}">
                  <span class="al-field-icon">📞</span>
                  <span class="al-field-label">最近联系</span>
                  <span class="al-field-value al-field-editable" data-field-type="date">${c["A-last-contact"] ? this.escapeHtml(c["A-last-contact"]) : '<span style="color:var(--text-muted)">点击设置</span>'}</span>
                </div>
                <div class="al-field-row" data-field="A-created" data-value="${this.escapeHtml(c["A-created"] || "")}">
                  <span class="al-field-icon">🗓️</span>
                  <span class="al-field-label">创建时间</span>
                  <span class="al-field-value al-field-editable" data-field-type="date">${this.escapeHtml(c["A-created"] || "")}</span>
                </div>
              </div>
            </div>

            <div class="al-detail-references-block" id="al-contact-interactions-block">
              <div class="al-detail-references-header">
                <span class="al-detail-references-icon">💬</span>
                <span class="al-detail-references-title">互动时间线</span>
                <span class="al-detail-references-count" id="al-contact-interactions-count">0</span>
              </div>
              <div class="al-detail-references-content" id="al-contact-interactions-container">
                <div class="al-detail-references-loading">加载中...</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  renderContactInteractions(items: ContactInteraction[]): string {
    if (items.length === 0) {
      return '<div class="al-detail-references-empty">暂无互动记录（在日记中用 #人脉/姓名 标记后自动汇总）</div>';
    }
    return `<ol class="mod-list">${items.map(i => `
      <li class="al-detail-reference-item" data-file-path="${i.filePath}" style="cursor:pointer;">
        <div class="al-reference-file-info">
          <span class="al-reference-file-icon">📄</span>
          <span class="al-reference-file-name">${this.escapeHtml(i.fileName)}:${i.lineNumber}</span>
          <span class="al-reference-line-number">${this.escapeHtml(i.date || "")}</span>
        </div>
        <div class="al-reference-content">${this.escapeHtml(i.lineContent)}</div>
      </li>`).join("")}</ol>`;
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

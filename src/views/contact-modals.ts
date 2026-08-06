/**
 * Dashboard View - Contact Modals
 *
 * 联系人创建/编辑 Modal
 * 使用 Obsidian Setting 组件实现，与创建目标/任务保持一致风格。
 */

import { Modal, Notice, Setting } from "obsidian";
import type { DashboardView } from "./DashboardView";
import { Contact, ContactPriority, ContactStatus } from "../types";

interface ContactFormState {
  title: string;
  nickname: string;
  relation: string;
  priority: ContactPriority;
  status: ContactStatus;
  gender: "" | "male" | "female" | "other";
  birthday: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  wechat: string;
  tags: string[];
  met: string;
  source: string;
  remindInterval: number;
  description: string;
}

function readContact(existing: Contact | null, fallback: { remindInterval?: number }): ContactFormState {
  const v = (k: keyof Contact, def: any = "") => (existing ? (existing[k] !== undefined && existing[k] !== null ? existing[k] : def) : def);
  const tags = existing && Array.isArray(existing["A-tags"]) ? (existing["A-tags"] as string[]) : [];
  return {
    title: String(v("A-title", "")),
    nickname: String(v("A-nickname", "")),
    relation: String(v("A-relation", "其他")),
    priority: Number(v("A-priority", 3)) as ContactPriority,
    status: v("A-status", "active") as ContactStatus,
    gender: v("A-gender", "") as ContactFormState["gender"],
    birthday: existing && existing["A-birthday"] ? String(existing["A-birthday"]) : "",
    company: existing && existing["A-company"] ? String(existing["A-company"]) : "",
    jobTitle: existing && existing["A-job-title"] ? String(existing["A-job-title"]) : "",
    phone: existing && existing["A-phone"] ? String(existing["A-phone"]) : "",
    email: existing && existing["A-email"] ? String(existing["A-email"]) : "",
    wechat: existing && existing["A-wechat"] ? String(existing["A-wechat"]) : "",
    tags,
    met: existing && existing["A-met"] ? String(existing["A-met"]) : "",
    source: existing && existing["A-source"] ? String(existing["A-source"]) : "",
    remindInterval: Number(v("A-remind-interval", fallback.remindInterval || 90)),
    description: existing && existing["A-description"] ? String(existing["A-description"]) : ""
  };
}

function buildDto(state: ContactFormState) {
  return {
    title: state.title,
    nickname: state.nickname,
    relation: state.relation,
    priority: state.priority,
    status: state.status,
    gender: state.gender,
    birthday: state.birthday || null,
    company: state.company || null,
    jobTitle: state.jobTitle || null,
    phone: state.phone || null,
    email: state.email || null,
    wechat: state.wechat || null,
    tags: state.tags,
    met: state.met || null,
    source: state.source || null,
    remindInterval: state.remindInterval,
    description: state.description || null
  };
}

function renderContactForm(
  contentEl: HTMLElement,
  view: DashboardView,
  existing: Contact | null,
  onSave: () => void
) {
  contentEl.empty();

  const settings = view.plugin.getSettings();
  const relations = settings.contactRelations || ["家人", "朋友", "同事", "客户", "导师", "同学", "邻居", "其他"];
  const state = readContact(existing, { remindInterval: settings.contactDefaultInterval || 90 });

  const isEdit = !!existing;
  const titleText = isEdit ? "编辑联系人" : "新建联系人";

  new Setting(contentEl).setName(titleText).setHeading();

  let nameInput: HTMLInputElement | null = null;
  new Setting(contentEl)
    .setName("姓名")
    .setDesc(isEdit ? "将作为文件名和识别标签" : "必填")
    .addText(text => {
      text.setPlaceholder("必填");
      text.setValue(state.title);
      text.inputEl.required = true;
      nameInput = text.inputEl;
    });

  // 新建时仅显示姓名，其他信息在详情页补充
  if (!isEdit) {
    new Setting(contentEl)
      .setName("提醒间隔（天）")
      .setDesc("多久后提醒联系（0 不提醒）")
      .addText(text => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.setValue(String(state.remindInterval));
      });

    new Setting(contentEl)
      .addButton(btn => {
        btn.setButtonText("取消");
        btn.onClick(() => onSave());
      })
      .addButton(btn => {
        btn.setButtonText("创建");
        btn.setCta();
        btn.onClick(async () => {
          const title = (nameInput && nameInput.value || "").trim();
          if (!title) { new Notice("请输入姓名"); return; }
          state.title = title;
          const findInput = (label: string): HTMLInputElement | null => {
            const items = contentEl.querySelectorAll(".setting-item");
            for (const wrap of items) {
              const nameEl = wrap.querySelector(".setting-item-name");
              if (nameEl && nameEl.textContent && nameEl.textContent.trim() === label) {
                const input = wrap.querySelector("input");
                return input as HTMLInputElement;
              }
            }
            return null;
          };
          state.remindInterval = Number(findInput("提醒间隔（天）")?.value || state.remindInterval) || 0;
          try {
            await view.plugin.getContactManager().createContact(buildDto(state));
            new Notice("已创建");
            onSave();
            view.loadAndRender();
          } catch (err) {
            new Notice("创建失败: " + (err as Error).message);
          }
        });
      });
    setTimeout(() => nameInput && nameInput.focus(), 100);
    return;
  }

  // 以下为编辑时的完整表单
  new Setting(contentEl)
    .setName("昵称")
    .addText(text => text.setValue(state.nickname));

  new Setting(contentEl)
    .setName("关系")
    .addDropdown(dropdown => {
      for (const r of relations) dropdown.addOption(r, r);
      dropdown.setValue(state.relation);
    });

  new Setting(contentEl)
    .setName("优先级")
    .addDropdown(dropdown => {
      dropdown.addOption("1", "核心");
      dropdown.addOption("2", "重要");
      dropdown.addOption("3", "一般");
      dropdown.addOption("4", "偶尔");
      dropdown.setValue(String(state.priority));
    });

  new Setting(contentEl)
    .setName("状态")
    .addDropdown(dropdown => {
      dropdown.addOption("active", "活跃");
      dropdown.addOption("archived", "已归档");
      dropdown.setValue(state.status);
    });

  new Setting(contentEl)
    .setName("性别")
    .addDropdown(dropdown => {
      dropdown.addOption("", "未指定");
      dropdown.addOption("male", "男");
      dropdown.addOption("female", "女");
      dropdown.addOption("other", "其他");
      dropdown.setValue(state.gender);
    });

  new Setting(contentEl)
    .setName("生日")
    .addText(text => {
      text.inputEl.type = "date";
      text.setValue(state.birthday);
    });

  new Setting(contentEl)
    .setName("公司")
    .addText(text => text.setValue(state.company));

  new Setting(contentEl)
    .setName("职位")
    .addText(text => text.setValue(state.jobTitle));

  new Setting(contentEl)
    .setName("电话")
    .addText(text => {
      text.inputEl.type = "tel";
      text.setValue(state.phone);
    });

  new Setting(contentEl)
    .setName("邮箱")
    .addText(text => {
      text.inputEl.type = "email";
      text.setValue(state.email);
    });

  new Setting(contentEl)
    .setName("微信")
    .addText(text => text.setValue(state.wechat));

  new Setting(contentEl)
    .setName("话题标签")
    .setDesc("逗号分隔，例如：跑步, 读书")
    .addText(text => text.setValue(state.tags.join(", ")));

  new Setting(contentEl)
    .setName("认识日期")
    .addText(text => {
      text.inputEl.type = "date";
      text.setValue(state.met);
    });

  new Setting(contentEl)
    .setName("认识途径")
    .addText(text => text.setValue(state.source));

  new Setting(contentEl)
    .setName("提醒间隔（天）")
    .setDesc("距离上次联系多久后提醒（0 表示不提醒）")
    .addText(text => {
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.setValue(String(state.remindInterval));
    });

  new Setting(contentEl)
    .setName("备注")
    .addTextArea(text => {
      text.setValue(state.description);
      text.inputEl.rows = 4;
    });

  new Setting(contentEl)
    .addButton(btn => {
      btn.setButtonText("取消");
      btn.onClick(() => onSave());
    })
    .addButton(btn => {
      btn.setButtonText("保存");
      btn.setCta();
      btn.onClick(async () => {
        const title = (nameInput && nameInput.value || "").trim();
        if (!title) { new Notice("请输入姓名"); return; }
        const findInput = (label: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null => {
          const items = contentEl.querySelectorAll(".setting-item");
          for (const wrap of items) {
            const nameEl = wrap.querySelector(".setting-item-name");
            if (nameEl && nameEl.textContent && nameEl.textContent.trim() === label) {
              const input = wrap.querySelector("input, textarea, select");
              return input as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement);
            }
          }
          return null;
        };
        const getValue = (label: string, fallback: string) => {
          const el = findInput(label);
          return el ? el.value : fallback;
        };
        state.title = title;
        state.nickname = getValue("昵称", state.nickname);
        state.relation = getValue("关系", state.relation);
        state.priority = Number(getValue("优先级", String(state.priority))) as ContactPriority;
        state.status = getValue("状态", state.status) as ContactStatus;
        state.gender = getValue("性别", state.gender) as ContactFormState["gender"];
        state.birthday = getValue("生日", state.birthday);
        state.company = getValue("公司", state.company);
        state.jobTitle = getValue("职位", state.jobTitle);
        state.phone = getValue("电话", state.phone);
        state.email = getValue("邮箱", state.email);
        state.wechat = getValue("微信", state.wechat);
        state.met = getValue("认识日期", state.met);
        state.source = getValue("认识途径", state.source);
        state.remindInterval = Number(getValue("提醒间隔（天）", String(state.remindInterval))) || 0;
        const textareas = contentEl.querySelectorAll("textarea");
        state.description = textareas.length > 0 ? textareas[0].value : "";
        const tagValue = getValue("话题标签", state.tags.join(", "));
        state.tags = tagValue ? tagValue.split(",").map(s => s.trim()).filter(Boolean) : [];
        try {
          await view.plugin.getContactManager().updateContact(existing!["A-id"], buildDto(state));
          new Notice("已保存");
          onSave();
          view.loadAndRender();
        } catch (err) {
          new Notice("保存失败: " + (err as Error).message);
        }
      });
    });

  setTimeout(() => nameInput && nameInput.focus(), 100);
}

export class CreateContactModal extends Modal {
  constructor(private view: DashboardView) {
    super(view.plugin.app);
  }

  onOpen(): void {
    renderContactForm(this.contentEl, this.view, null, () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class EditContactModal extends Modal {
  constructor(private view: DashboardView, private contactId: string) {
    super(view.plugin.app);
  }

  onOpen(): void {
    const c = this.view.plugin.getContactManager().getContact(this.contactId);
    if (!c) { this.close(); return; }
    renderContactForm(this.contentEl, this.view, c, () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

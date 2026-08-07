/**
 * Dashboard View - Modal Dialogs
 *
 * 从 DashboardView.ts 末尾抽出的弹窗类：
 * - DeleteConfirmModal：删除目标确认弹窗
 * - CoverImagePickerModal：封面图片选择弹窗
 *
 * 这两个类原本就是独立的顶层类，原样搬迁，仅调整 import。
 */

import { Modal, Notice, TFile } from 'obsidian';
import AmazingLife from '../main';

/**
 * 删除确认弹窗（Obsidian 原生 Modal 风格）
 *
 * 默认用于删除目标，可通过 options 自定义标题/文案/按钮文字，
 * 以复用于任务删除等场景。
 */
export class DeleteConfirmModal extends Modal {
  private goalTitle: string;
  private onConfirm: () => void;
  private title: string;
  private message: string;
  private confirmText: string;

  constructor(
    plugin: AmazingLife,
    goalTitle: string,
    onConfirm: () => void,
    options?: { title?: string; message?: string; confirmText?: string }
  ) {
    super(plugin.app);
    this.goalTitle = goalTitle;
    this.onConfirm = onConfirm;
    this.title = options?.title ?? '删除目标';
    this.message = options?.message ?? `确定要删除目标「${this.goalTitle}」吗？此操作不可撤销。`;
    this.confirmText = options?.confirmText ?? '删除';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: this.title, cls: 'al-modal-header' });

    const body = contentEl.createDiv('al-modal-body');
    body.createEl('p', { text: this.message });

    const footer = contentEl.createDiv('al-modal-footer');
    const cancelBtn = footer.createEl('button', { text: '取消' });
    const deleteBtn = footer.createEl('button', { text: this.confirmText, cls: 'mod-warning' });

    cancelBtn.addEventListener('click', () => this.close());
    deleteBtn.addEventListener('click', () => {
      this.onConfirm();
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * 封面图片选择弹窗
 */
export class CoverImagePickerModal extends Modal {
  private plugin: AmazingLife;
  private goalId: string;
  private onSelect: (imagePath: string) => void;
  private onRemove: () => void;
  private currentCover: string | null;

  constructor(plugin: AmazingLife, goalId: string, currentCover: string | null, onSelect: (imagePath: string) => void, onRemove: () => void) {
    super(plugin.app);
    this.plugin = plugin;
    this.goalId = goalId;
    this.currentCover = currentCover;
    this.onSelect = onSelect;
    this.onRemove = onRemove;
  }

  private getCoverImageUrl(path: string | null): string | null {
    if (!path) return null;

    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('app://')) {
      return path;
    }

    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        return (this.plugin.app.vault as any).getResourcePath(file);
      }
    } catch (e) {
      console.warn('封面图文件不存在:', path);
    }

    return null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '设置封面图片', cls: 'al-modal-header' });

    const body = contentEl.createDiv('al-modal-body');

    const previewUrl = this.getCoverImageUrl(this.currentCover);
    if (previewUrl) {
      const previewContainer = body.createDiv('al-cover-preview');
      const previewImg = previewContainer.createEl('img');
      previewImg.src = previewUrl;
    }

    const urlSection = body.createDiv('al-cover-section');
    urlSection.createEl('label', { text: '图片 URL' });
    const urlInput = urlSection.createEl('input');
    urlInput.type = 'text';
    urlInput.placeholder = '输入图片 URL 或选择本地图片...';
    urlInput.value = this.currentCover || '';

    const localBtn = body.createEl('button', { text: '📁 选择本地图片', cls: 'al-cover-btn' });

    localBtn.addEventListener('click', async () => {
      const inputEl = document.createElement('input');
      inputEl.type = 'file';
      inputEl.accept = 'image/*';
      inputEl.addClass('al-file-input-overlay');
      document.body.appendChild(inputEl);

      const cleanup = () => {
        if (document.body.contains(inputEl)) {
          document.body.removeChild(inputEl);
        }
      };

      inputEl.onchange = async () => {
        const file = inputEl.files?.[0];
        if (file) {
          try {
            const coversPath = this.plugin.getSettings().coverPath;
            await this.plugin.app.vault.createFolder(coversPath).catch(() => {});

            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${this.goalId}_${Date.now()}.${fileExt}`;
            const targetPath = `${coversPath}/${fileName}`;

            const arrayBuffer = await file.arrayBuffer();
            await this.plugin.app.vault.createBinary(targetPath, arrayBuffer);

            const savedFile = this.plugin.app.vault.getAbstractFileByPath(targetPath);
            if (savedFile instanceof TFile) {
              urlInput.value = targetPath;
              new Notice('图片上传成功');
            } else {
              throw new Error('保存后无法获取文件对象');
            }
          } catch (vaultError) {
            console.warn('vault 保存失败，降级到 base64:', vaultError);
            try {
              const reader = new FileReader();
              const base64Url = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              urlInput.value = base64Url;
              new Notice('图片已加载为 base64 格式');
            } catch (base64Error) {
              new Notice('上传图片失败: ' + (base64Error as Error).message);
            }
          }
        }
        cleanup();
      };

      setTimeout(() => {
        inputEl.click();
      }, 0);

      const handleCancel = () => {
        cleanup();
        window.removeEventListener('focus', handleCancel);
      };
      window.addEventListener('focus', handleCancel, { once: true });
    });

    const footer = contentEl.createDiv('al-modal-footer');

    if (this.currentCover) {
      const removeBtn = footer.createEl('button', { text: '移除封面', cls: 'mod-warning' });
      removeBtn.addEventListener('click', () => {
        this.onRemove();
        this.close();
      });
    }

    const cancelBtn = footer.createEl('button', { text: '取消' });
    cancelBtn.addEventListener('click', () => this.close());

    const confirmBtn = footer.createEl('button', { text: '确认', cls: 'mod-cta' });
    confirmBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) {
        this.onSelect(url);
      }
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

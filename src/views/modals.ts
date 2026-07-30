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
 * 删除目标确认弹窗
 */
export class DeleteConfirmModal extends Modal {
  private goalTitle: string;
  private onConfirm: () => void;

  constructor(plugin: AmazingLife, goalTitle: string, onConfirm: () => void) {
    super(plugin.app);
    this.goalTitle = goalTitle;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '删除目标', cls: 'al-modal-header' });

    const body = contentEl.createDiv('al-modal-body');
    body.createEl('p', { text: `确定要删除目标「${this.goalTitle}」吗？此操作不可撤销。` });

    const footer = contentEl.createDiv('al-modal-footer');
    const cancelBtn = footer.createEl('button', { text: '取消', cls: 'al-btn al-btn-secondary' });
    const deleteBtn = footer.createEl('button', { text: '删除', cls: 'al-btn al-btn-danger' });

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

  // 将封面图路径转换为可显示的 URL
  private getCoverImageUrl(path: string | null): string | null {
    if (!path) return null;

    // 如果已经是 http/https 或 app:// URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('app://')) {
      return path;
    }

    // 如果是 vault 中的文件路径，使用 getResourcePath 转换
    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      // getResourcePath 需要 TFile 对象
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
    body.style.padding = '20px';

    // 当前封面预览
    const previewUrl = this.getCoverImageUrl(this.currentCover);
    if (previewUrl) {
      const previewContainer = body.createDiv();
      previewContainer.style.marginBottom = '16px';
      previewContainer.style.textAlign = 'center';

      const previewImg = previewContainer.createEl('img');
      previewImg.src = previewUrl;
      previewImg.style.maxWidth = '100%';
      previewImg.style.maxHeight = '200px';
      previewImg.style.borderRadius = '8px';
      previewImg.style.objectFit = 'cover';
    }

    // 图片URL输入
    const urlSection = body.createDiv();
    urlSection.style.marginBottom = '16px';

    const urlLabel = urlSection.createEl('label');
    urlLabel.textContent = '图片 URL';
    urlLabel.style.display = 'block';
    urlLabel.style.marginBottom = '8px';
    urlLabel.style.fontSize = '13px';
    urlLabel.style.color = 'var(--text-secondary)';

    const urlInput = urlSection.createEl('input');
    urlInput.type = 'text';
    urlInput.placeholder = '输入图片 URL 或选择本地图片...';
    urlInput.style.width = '100%';
    urlInput.style.padding = '10px 12px';
    urlInput.style.border = '1px solid var(--border-color)';
    urlInput.style.borderRadius = '6px';
    urlInput.style.background = 'var(--background-secondary)';
    urlInput.style.color = 'var(--text-primary)';
    urlInput.style.boxSizing = 'border-box';
    urlInput.value = this.currentCover || '';

    // 选择本地图片按钮
    const localBtn = body.createEl('button');
    localBtn.textContent = '📁 选择本地图片';
    localBtn.style.width = '100%';
    localBtn.style.padding = '10px';
    localBtn.style.marginBottom = '16px';
    localBtn.style.border = '1px solid var(--border-color)';
    localBtn.style.borderRadius = '6px';
    localBtn.style.background = 'var(--background-secondary)';
    localBtn.style.color = 'var(--text-primary)';
    localBtn.style.cursor = 'pointer';
    localBtn.style.fontSize = '14px';

    localBtn.addEventListener('click', async () => {
      const inputEl = document.createElement('input');
      inputEl.type = 'file';
      inputEl.accept = 'image/*';
      // iOS 兼容：使用 position 隐藏而非 display:none，确保 input 可交互
      inputEl.style.position = 'absolute';
      inputEl.style.left = '-9999px';
      inputEl.style.top = '0';
      inputEl.style.opacity = '0';
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
            // 优先尝试保存到 vault（桌面端和移动端通用）
            const coversPath = this.plugin.getSettings().coverPath;
            await this.plugin.app.vault.createFolder(coversPath).catch(() => {});

            // 生成安全的文件名
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${this.goalId}_${Date.now()}.${fileExt}`;
            const targetPath = `${coversPath}/${fileName}`;

            // 将文件保存为 vault 中的文件（二进制）
            const arrayBuffer = await file.arrayBuffer();
            await this.plugin.app.vault.createBinary(targetPath, arrayBuffer);

            // 校验文件已成功保存到 vault
            const savedFile = this.plugin.app.vault.getAbstractFileByPath(targetPath);
            if (savedFile instanceof TFile) {
              // 始终存储 vault 相对路径，显示时由 getCoverImageUrl 通过 getResourcePath 解析
              // 这样可避免移动端 resourcePath 不持久、重启后失效的问题
              urlInput.value = targetPath;
              new Notice('图片上传成功');
            } else {
              throw new Error('保存后无法获取文件对象');
            }
          } catch (vaultError) {
            // vault 保存失败，降级到 base64 编码（移动端兼容）
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

      // iOS 兼容：使用 setTimeout 延迟调用 click，确保在用户手势事件之后执行
      setTimeout(() => {
        inputEl.click();
      }, 0);

      // 处理取消选择的情况
      const handleCancel = () => {
        cleanup();
        window.removeEventListener('focus', handleCancel);
      };
      window.addEventListener('focus', handleCancel, { once: true });
    });

    // 按钮区域
    const footer = contentEl.createDiv('al-modal-footer');

    if (this.currentCover) {
      const removeBtn = footer.createEl('button', { text: '移除封面', cls: 'al-btn al-btn-danger' });
      removeBtn.addEventListener('click', () => {
        this.onRemove();
        this.close();
      });
    }

    const cancelBtn = footer.createEl('button', { text: '取消', cls: 'al-btn al-btn-secondary' });
    cancelBtn.addEventListener('click', () => this.close());

    const confirmBtn = footer.createEl('button', { text: '确认', cls: 'al-btn' });
    confirmBtn.style.background = 'var(--interactive-accent)';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.border = 'none';
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

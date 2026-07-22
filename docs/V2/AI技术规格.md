# AI 技术规格

**版本**: v2.0.0  
**创建日期**: 2026-07-22

---

## 一、技术架构

### 1.1 AI 服务架构

```typescript
interface AIProvider {
  name: string;
  type: 'cloud' | 'local';
  
  // 初始化
  initialize(): Promise<void>;
  
  // 聊天补全
  chat(prompt: string, context?: Record<string, any>): Promise<string>;
  
  // 嵌入向量（用于语义搜索）
  embed(text: string): Promise<number[]>;
  
  // 模型信息
  getModelInfo(): ModelInfo;
}

interface ModelInfo {
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
  costPerToken?: number;
}
```

### 1.2 项目结构

```
src/
├── ai/
│   ├── AIProvider.ts           # AI 提供商抽象接口
│   ├── AIServiceManager.ts     # AI 服务管理器
│   ├── providers/
│   │   ├── OpenAIProvider.ts   # OpenAI 实现
│   │   ├── ClaudeProvider.ts   # Claude 实现
│   │   ├── OllamaProvider.ts   # 本地模型实现
│   │   └── SiliconFlowProvider.ts  # SiliconFlow 实现
│   ├── features/
│   │   ├── GoalAnalyzer.ts     # 目标分析
│   │   ├── PlanGenerator.ts    # 计划生成
│   │   ├── ReportGenerator.ts  # 报告生成
│   │   └── ChatAssistant.ts    # 对话助手
│   ├── prompts/
│   │   ├── index.ts            # 提示词导出
│   │   ├── goalPrompts.ts      # 目标分析提示词
│   │   ├── planPrompts.ts      # 计划生成提示词
│   │   └── reportPrompts.ts    # 报告生成提示词
│   ├── cache/
│   │   └── AIResponseCache.ts  # 响应缓存
│   ├── cost/
│   │   └── UsageTracker.ts     # 使用统计
│   └── utils/
│       ├── DataSanitizer.ts    # 数据脱敏
│       └── RetryManager.ts     # 重试管理
```

---

## 二、数据模型

### 2.1 AI 配置模型

```typescript
interface AISettings {
  // 启用 AI 功能
  enabled: boolean;
  
  // 选择提供商
  provider: 'openai' | 'anthropic' | 'local' | 'siliconflow';
  
  // API 配置
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  
  // 本地模型配置
  localModel?: string;
  localPort?: number;
  
  // 隐私设置
  privacy: {
    useLocalByDefault: boolean;    // 默认使用本地模型
    sanitizeBeforeSend: boolean;   // 发送前脱敏
    includeTags: boolean;          // 包含标签上下文
  };
  
  // 使用限制
  limits: {
    maxTokensPerRequest: number;
    requestsPerDay: number;
    monthlyBudget?: number;
  };
}
```

### 2.2 使用统计模型

```typescript
interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  successRate: number;
  averageLatency: number;
  costEstimate: number;
  dailyUsage: { date: string; tokens: number }[];
}

interface BudgetStatus {
  daily: {
    used: number;
    limit: number;
    remaining: number;
    warning: boolean;
  };
  monthly: {
    used: number;
    limit: number;
    remaining: number;
    warning: boolean;
  };
}
```

### 2.3 AI 结果模型

```typescript
interface AIResult<T> {
  success: boolean;
  data?: T;
  error?: AIError;
  metadata: {
    model: string;
    tokens: number;
    latency: number;
    cached: boolean;
  };
}

interface AIError {
  type: AIErrorType;
  message: string;
  retryable: boolean;
}

enum AIErrorType {
  NETWORK_ERROR = '网络错误，请检查连接',
  RATE_LIMIT = '请求过于频繁，请稍后再试',
  QUOTA_EXCEEDED = 'API 配额已用完，请等待或升级',
  INVALID_API_KEY = 'API 密钥无效，请检查配置',
  MODEL_UNAVAILABLE = '模型暂时不可用，请稍后再试',
  CONTENT_FILTERED = '内容被过滤，请修改后重试',
  TIMEOUT = '请求超时，请重试',
  UNKNOWN = '未知错误，请联系开发者'
}
```

---

## 三、核心功能实现

### 3.1 目标分析

```typescript
class GoalAnalyzer {
  async analyzeGoal(goalId: string): Promise<GoalAnalysisResult> {
    const goal = await goalManager.getGoal(goalId);
    const tasks = await taskManager.getTasksByGoal(goalId);
    
    const prompt = this.buildAnalysisPrompt(goal, tasks);
    const response = await this.aiService.chat(prompt);
    
    return this.parseAnalysisResult(response);
  }
  
  private buildAnalysisPrompt(goal: Goal, tasks: Task[]): string {
    const taskSummary = tasks.map(t => 
      `- ${t.title} [${t.status}]`
    ).join('\n');
    
    return PROMPTS.analyzeGoal
      .replace('{goalTitle}', goal.title)
      .replace('{goalDescription}', goal.description)
      .replace('{progress}', goal.progress.toString())
      .replace('{startDate}', goal.startDate)
      .replace('{dueDate}', goal.dueDate || '未设置')
      .replace('{taskSummary}', taskSummary);
  }
}

interface GoalAnalysisResult {
  trend: 'improving' | 'stable' | 'declining';
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
  predictedCompletion: string | null;
  confidence: number;
}
```

### 3.2 计划生成

```typescript
class PlanGenerator {
  async generateWeeklyPlan(
    goalId: string, 
    availableHours: number
  ): Promise<WeeklyPlan> {
    const goal = await goalManager.getGoal(goalId);
    const pendingTasks = await taskManager.getPendingTasks(goalId);
    
    const prompt = PROMPTS.generateWeeklyPlan
      .replace('{goalTitle}', goal.title)
      .replace('{progress}', goal.progress.toString())
      .replace('{dueDate}', goal.dueDate || '未设置')
      .replace('{availableHours}', availableHours.toString())
      .replace('{existingTasks}', pendingTasks.map(t => t.title).join(', '));
    
    const response = await this.aiService.chat(prompt);
    return this.parsePlanResult(response);
  }
  
  async importToDailyNotes(plan: WeeklyPlan): Promise<void> {
    for (const dayPlan of plan.days) {
      const date = dayPlan.date;
      const tasks = dayPlan.tasks.map(t => `- [ ] ${t.title}`).join('\n');
      
      await noteManager.appendToDailyNote(date, `\n${tasks}\n`);
    }
  }
}

interface WeeklyPlan {
  days: {
    date: string;
    tasks: {
      title: string;
      description: string;
      priority: number;
      estimatedHours: number;
    }[];
  }[];
  reasoning: string;
  tips: string[];
}
```

### 3.3 报告生成

```typescript
class ReportGenerator {
  async generateWeeklyReport(weekPath: string): Promise<string> {
    const weeklyNote = await noteManager.loadNote(weekPath);
    const noteworthyItems = this.extractNoteworthy(weeklyNote);
    
    const weekDates = this.getWeekDates(weekPath);
    const dailyNotes = await Promise.all(
      weekDates.map(d => noteManager.loadNote(`Daily/${d}.md`))
    );
    
    const completedTasks = this.extractCompletedTasks(dailyNotes);
    
    const prompt = PROMPTS.generateWeeklyReport
      .replace('{weekStart}', weekDates[0])
      .replace('{weekEnd}', weekDates[6])
      .replace('{noteworthyItems}', noteworthyItems.join('\n'))
      .replace('{completedTasks}', completedTasks.join(', '));
    
    return this.aiService.chat(prompt);
  }
}
```

---

## 四、性能优化

### 4.1 响应缓存

```typescript
class AIResponseCache {
  private cache: Map<string, CacheEntry>;
  
  generateKey(prompt: string, context: Record<string, any>): string {
    const hash = crypto.createHash('sha256');
    hash.update(prompt + JSON.stringify(context));
    return hash.digest('hex').substring(0, 16);
  }
  
  async getCachedResponse(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.response;
  }
}
```

### 4.2 流式响应

```typescript
async function* streamResponse(
  prompt: string
): AsyncGenerator<string> {
  const response = await aiProvider.chatStream(prompt);
  
  for await (const chunk of response) {
    yield chunk;
  }
}

async function renderWithStream(
  prompt: string, 
  container: HTMLElement
): Promise<void> {
  container.innerHTML = '';
  
  for await (const chunk of streamResponse(prompt)) {
    container.innerHTML += chunk;
  }
}
```

### 4.3 重试机制

```typescript
class RetryManager {
  async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (!this.isRetryable(error)) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, i);
        await this.sleep(delay);
      }
    }
    
    throw new Error('重试次数已用完');
  }
  
  isRetryable(error: AIError): boolean {
    return [
      AIErrorType.NETWORK_ERROR,
      AIErrorType.TIMEOUT,
      AIErrorType.RATE_LIMIT
    ].includes(error.type);
  }
}
```

---

## 五、成本控制

### 5.1 使用统计

```typescript
class UsageTracker {
  async getStats(): Promise<UsageStats> {
    return {
      totalRequests: await this.countRequests(),
      totalTokens: await this.sumTokens(),
      successRate: await this.calculateSuccessRate(),
      averageLatency: await this.calculateAvgLatency(),
      costEstimate: await this.estimateCost(),
      dailyUsage: await this.getDailyBreakdown()
    };
  }
  
  async estimateCost(): Promise<number> {
    const provider = this.getCurrentProvider();
    const stats = await this.getStats();
    
    return stats.totalTokens * (provider.costPerToken || 0);
  }
}
```

### 5.2 预算控制

```typescript
class BudgetController {
  async checkBudget(): Promise<BudgetStatus> {
    const todayUsage = await this.getTodayUsage();
    const monthUsage = await this.getMonthUsage();
    
    return {
      daily: {
        used: todayUsage,
        limit: this.settings.limits.dailyLimit,
        remaining: this.settings.limits.dailyLimit - todayUsage,
        warning: todayUsage / this.settings.limits.dailyLimit > 
                 this.settings.limits.warnAtPercentage
      },
      monthly: {
        used: monthUsage,
        limit: this.settings.limits.monthlyLimit,
        remaining: this.settings.limits.monthlyLimit - monthUsage,
        warning: monthUsage / this.settings.limits.monthlyLimit > 
                 this.settings.limits.warnAtPercentage
      }
    };
  }
}
```

---

## 六、版本规划

### V2.0 - AI 基础版

- [ ] AI 服务架构搭建
- [ ] OpenAI / Claude 支持
- [ ] 目标分析功能
- [ ] 计划生成功能
- [ ] 基础设置界面

### V2.1 - AI 增强版

- [ ] 本地模型支持（Ollama）
- [ ] 报告生成功能
- [ ] 使用统计和成本控制
- [ ] 错误处理和重试

### V2.2 - AI 智能版

- [ ] 对话助手
- [ ] 智能标签建议
- [ ] 高级分析功能
- [ ] 插件市场发布

---

*本文档最后更新于 2026-07-22*

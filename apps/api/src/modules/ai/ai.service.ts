import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Модели через Anthropic API формат (/v1/messages)
const ANTHROPIC_FORMAT_MODELS = new Set([
  'qwen3.7-plus',
  'qwen3.7-max',
  'minimax-m3',
]);

// Модели через Responses API (/v1/responses, stream обязателен)
const RESPONSES_API_MODELS = new Set([
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.4-mini',
]);

// Reasoning модели (потребляют токены на "думалку")
const REASONING_MODELS = new Set([
  'deepseek-v4-flash',
  'deepseek-v4-pro',
  'kimi-k2.6',
]);

@Injectable()
export class AiService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl =
      process.env.OPENAI_BASE_URL || 'https://api.neurogate.space/v1';

    if (this.apiKey) {
      this.openai = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseUrl });
      const anthropicBase = this.baseUrl.replace(/\/v1\/?$/, '');
      this.anthropic = new Anthropic({
        apiKey: this.apiKey,
        baseURL: anthropicBase,
      });
    }
  }

  private async buildContext(currentUser: AuthUser): Promise<string> {
    const [tasks, news, totalUsers, departments] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          OR: [
            { creatorId: currentUser.id },
            { assigneeId: currentUser.id },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.newsPost.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          OR: [
            { personnelNumber: { not: null } },
            { lastName: { not: null } },
            { firstName: { not: null } },
            { department: { not: null } },
            { position: { not: null } },
          ],
        },
      }),
      this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { personnelNumber: { not: null } },
            { lastName: { not: null } },
            { firstName: { not: null } },
            { department: { not: null } },
            { position: { not: null } },
          ],
        },
        select: { department: true },
        distinct: ['department'],
      }),
    ]);

    const deptList = departments
      .map((d) => d.department)
      .filter(Boolean)
      .join(', ');

    return `Вы — AI-ассистент корпоративного портала Factory 1.0. Ваша роль — помогать сотрудникам, отвечать на вопросы о портале, их задачах, новостях и компании.
Вы общаетесь в вежливом, профессиональном корпоративном тоне на русском языке.
Используйте форматирование markdown (жирный текст, списки, заголовки, ссылки) для повышения читаемости ответов.

Контекст портала для пользователя:
- Текущий пользователь: Имя: "${currentUser.name || 'Не указано'}", Почта: "${currentUser.email}", Роль: "${currentUser.role}".
- Всего активных сотрудников: ${totalUsers}.
- Отделы: ${deptList || 'Отделы отсутствуют'}.
- Актуальные задачи (до 10):
${tasks.map((t, idx) => `${idx + 1}. [${t.status}] "${t.title}" (Исполнитель: ${t.assignee?.name || t.assignee?.email || 'Не назначен'}, Срок: ${t.dueAt ? t.dueAt.toISOString().slice(0, 16).replace('T', ' ') : 'Без срока'})`).join('\n') || 'Задачи отсутствуют.'}

- Последние новости (до 5):
${news.map((n, idx) => `${idx + 1}. "${n.title}" от ${n.author?.name || n.author?.email || 'Система'} (${n.publishedAt ? n.publishedAt.toISOString().slice(0, 10) : 'Без даты'})`).join('\n') || 'Публикации отсутствуют.'}

Ссылки: задачи → /tasks, сообщения → /messages, новости → /news.
Если информация недоступна — сообщи об этом вежливо.`;
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    currentUser: AuthUser,
    model?: string,
    systemPromptOverride?: string,
  ): Promise<{ content: string; setupRequired?: boolean }> {
    if (!this.openai || !this.apiKey) {
      return { content: '', setupRequired: true };
    }

    const selectedModel = model || process.env.OPENAI_MODEL || 'deepseek-v4-flash';
    const systemPrompt = systemPromptOverride || await this.buildContext(currentUser);

    try {
      if (RESPONSES_API_MODELS.has(selectedModel)) {
        return await this.chatViaResponsesApi(messages, systemPrompt, selectedModel);
      }

      if (ANTHROPIC_FORMAT_MODELS.has(selectedModel) && this.anthropic) {
        return await this.chatViaAnthropic(messages, systemPrompt, selectedModel);
      }

      return await this.chatViaOpenAI(messages, systemPrompt, selectedModel);
    } catch (error: unknown) {
      const errMsg = (error as { message?: string })?.message || String(error);

      // Fallback: если OpenAI-формат не работает — пробуем Anthropic
      if (
        errMsg.toLowerCase().includes('upstream') &&
        this.anthropic &&
        !ANTHROPIC_FORMAT_MODELS.has(selectedModel) &&
        !RESPONSES_API_MODELS.has(selectedModel)
      ) {
        console.log(`[AI] Fallback to Anthropic for ${selectedModel}`);
        try {
          return await this.chatViaAnthropic(messages, systemPrompt, selectedModel);
        } catch (fallbackErr) {
          console.error('[AI] Anthropic fallback failed:', fallbackErr);
        }
      }

      console.error('[AI] Chat error:', error);
      throw new BadRequestException(
        errMsg.includes('upstream')
          ? `Модель ${selectedModel} сейчас недоступна. Попробуйте другую.`
          : 'Ошибка при обращении к ИИ-ассистенту.',
      );
    }
  }

  /**
   * OpenAI Chat Completions API (/v1/chat/completions)
   */
  private async chatViaOpenAI(
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    systemPrompt: string,
    selectedModel: string,
  ): Promise<{ content: string }> {
    const isReasoning = REASONING_MODELS.has(selectedModel);
    const formattedMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));

    const response = await this.openai!.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages,
      ],
      max_tokens: 3000,
      temperature: isReasoning ? undefined : 0.7,
      ...(isReasoning && { reasoning_effort: 'low' } as object),
    });

    return {
      content:
        response.choices[0]?.message?.content ||
        'Не удалось получить ответ от ассистента.',
    };
  }

  /**
   * OpenAI Responses API (/v1/responses) — требует stream:true, store:false
   * Используется для gpt-5.5, gpt-5.4 и подобных
   */
  private async chatViaResponsesApi(
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    systemPrompt: string,
    selectedModel: string,
  ): Promise<{ content: string }> {
    const baseWithoutSlash = this.baseUrl.replace(/\/$/, '');
    const url = `${baseWithoutSlash}/responses`;

    const input = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body = {
      model: selectedModel,
      instructions: systemPrompt,
      input,
      store: false,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Responses API error: ${errText}`);
    }

    // Читаем SSE стрим и собираем текст
    const text = await response.text();
    let fullText = '';

    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') break;
      try {
        const event = JSON.parse(raw) as Record<string, unknown>;
        // response.output_text.delta — фрагменты текста
        if (
          event.type === 'response.output_text.delta' &&
          typeof event.delta === 'string'
        ) {
          fullText += event.delta;
        }
        // На случай другого формата
        const delta = (event as { delta?: { text?: string } }).delta;
        if (typeof delta === 'object' && delta && typeof delta.text === 'string') {
          fullText += delta.text;
        }
      } catch {
        // skip parse errors
      }
    }

    return {
      content: fullText || 'Не удалось получить ответ от ассистента.',
    };
  }

  /**
   * Anthropic Messages API (/v1/messages)
   * Используется для qwen, minimax и др.
   */
  private async chatViaAnthropic(
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    systemPrompt: string,
    selectedModel: string,
  ): Promise<{ content: string }> {
    const formattedMessages = messages.map((m) => {
      let content = m.content;
      
      // Конвертация формата OpenAI в формат Anthropic для multimodal
      if (Array.isArray(m.content)) {
        content = m.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          if (part.type === 'image_url') {
            const match = part.image_url.url.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
            if (match) {
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: match[1],
                  data: match[2]
                }
              };
            }
          }
          return part;
        });
      }

      return {
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content,
      };
    });

    const response = await this.anthropic!.messages.create({
      model: selectedModel,
      system: systemPrompt,
      messages: formattedMessages,
      max_tokens: 3000,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return {
      content:
        (textBlock as { type: 'text'; text: string } | undefined)?.text ||
        'Не удалось получить ответ от ассистента.',
    };
  }
}

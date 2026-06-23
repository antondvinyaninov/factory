"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUserCached } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { 
  SendIcon, 
  SparklesIcon, 
  Trash2Icon, 
  BotIcon, 
  ClipboardListIcon,
  FileTextIcon,
  UsersIcon,
  ChevronDownIcon,
  CheckIcon,
  ZapIcon,
  BrainIcon,
} from "lucide-react"

type ChatUser = {
  id: string
  name: string
  email: string
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  model?: string
}

type ModelOption = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  badge?: string
  unstable?: boolean
}

const MODELS: ModelOption[] = [
  // --- Стабильные (OpenAI формат) ---
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek Flash",
    description: "Быстрый · reasoning",
    icon: <ZapIcon className="size-3.5 text-yellow-500" />,
    badge: "Рекомендуем",
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek Pro",
    description: "Мощный · reasoning",
    icon: <BrainIcon className="size-3.5 text-blue-500" />,
  },
  {
    id: "glm-5.1",
    label: "GLM 5.1",
    description: "Zhipu AI",
    icon: <SparklesIcon className="size-3.5 text-purple-500" />,
  },
  {
    id: "kimi-k2.6",
    label: "Kimi K2.6",
    description: "Moonshot AI · reasoning",
    icon: <SparklesIcon className="size-3.5 text-indigo-500" />,
  },
  {
    id: "mimo-v2.5",
    label: "Mimo v2.5",
    description: "Лёгкая модель",
    icon: <ZapIcon className="size-3.5 text-emerald-500" />,
  },
  {
    id: "mimo-v2.5-pro",
    label: "Mimo Pro",
    description: "Pro версия",
    icon: <BrainIcon className="size-3.5 text-teal-500" />,
  },
  {
    id: "vibe-lite-1",
    label: "Vibe Lite",
    description: "Ультрадешёвый",
    icon: <ZapIcon className="size-3.5 text-orange-400" />,
  },
  // --- Стабильные (Anthropic формат) ---
  {
    id: "qwen3.7-max",
    label: "Qwen 3.7 Max",
    description: "Alibaba · мощная",
    icon: <BrainIcon className="size-3.5 text-orange-500" />,
  },
  {
    id: "qwen3.7-plus",
    label: "Qwen 3.7 Plus",
    description: "Alibaba · быстрая",
    icon: <ZapIcon className="size-3.5 text-orange-400" />,
  },
  {
    id: "minimax-m3",
    label: "MiniMax M3",
    description: "MiniMax AI",
    icon: <SparklesIcon className="size-3.5 text-pink-500" />,
  },
  // --- Нестабильные (rate limited) ---
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    description: "OpenAI флагман",
    icon: <SparklesIcon className="size-3.5 text-green-500" />,
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    description: "OpenAI мощная",
    icon: <SparklesIcon className="size-3.5 text-emerald-500" />,
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "OpenAI лёгкая",
    icon: <ZapIcon className="size-3.5 text-emerald-400" />,
  },
]

function getInitials(name: string, email: string) {
  const source = name || email || "П"
  return source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function parseMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, "<li class='ml-4 list-disc my-1 text-sm'>$1</li>")
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
    const isLocal = url.startsWith("/")
    const target = isLocal ? "" : 'target="_blank" rel="noopener noreferrer"'
    return `<a href="${url}" class="underline text-primary font-medium hover:opacity-85 transition-opacity" ${target}>${label}</a>`
  })
  html = html.replace(/\n/g, "<br />")
  return html
}

const suggestions = [
  {
    label: "Какие у меня задачи?",
    icon: <ClipboardListIcon className="size-4 text-emerald-500" />,
    text: "Какие задачи у меня сейчас в работе?"
  },
  {
    label: "Что нового на портале?",
    icon: <FileTextIcon className="size-4 text-blue-500" />,
    text: "Покажи последние новости портала"
  },
  {
    label: "Сколько сотрудников?",
    icon: <UsersIcon className="size-4 text-purple-500" />,
    text: "Кто работает в компании и какие есть отделы?"
  },
  {
    label: "Справка по разделам",
    icon: <SparklesIcon className="size-4 text-amber-500" />,
    text: "Расскажи, как пользоваться порталом Factory 1.0?"
  }
]

function ModelSelector({
  selected,
  onChange,
}: {
  selected: ModelOption
  onChange: (m: ModelOption) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
          "bg-background hover:bg-muted/60 border-border/80 text-foreground",
          open && "border-primary/40 bg-muted/60"
        )}
        title="Выбрать модель ИИ"
      >
        {selected.icon}
        <span className="max-w-[90px] truncate">{selected.label}</span>
        <ChevronDownIcon className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-border bg-popover shadow-lg shadow-black/10 overflow-hidden">
          <div className="p-1.5 border-b border-border/60">
            <p className="text-[10px] text-muted-foreground px-2 py-0.5 font-medium uppercase tracking-wide">Выбор модели</p>
          </div>
          <div className="p-1.5 flex flex-col gap-0.5 max-h-72 overflow-y-auto">
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m); setOpen(false) }}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all w-full group",
                  selected.id === m.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/60 text-foreground"
                )}
              >
                <span className="shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">{m.label}</span>
                    {m.badge && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.description}</p>
                </div>
                {selected.id === m.id && (
                  <CheckIcon className="size-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiAssistantPage() {
  const [currentUser, setCurrentUser] = React.useState<ChatUser | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [selectedModel, setSelectedModel] = React.useState<ModelOption>(MODELS[0])
  
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    async function loadUser() {
      try {
        const cached = await getCurrentUserCached()
        if (cached) {
          setCurrentUser({
            id: cached.id,
            name: cached.name ?? cached.email,
            email: cached.email
          })
        }
      } catch (err) {
        console.error("Failed to load user info", err)
      }
    }
    void loadUser()
  }, [])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  async function handleSend(textToSend: string) {
    const trimmed = textToSend.trim()
    if (!trimmed || isLoading) return

    setError("")
    setInputValue("")
    setIsLoading(true)

    const userMessage: Message = {
      id: `msg-user-${messages.length}`,
      role: "user",
      content: trimmed,
      createdAt: new Date()
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          model: selectedModel.id,
        })
      })

      if (!response.ok) {
        let errMsg = "Не удалось получить ответ от ассистента."
        try {
          const errData = await response.json()
          const apiMsg = errData?.message || errData?.error?.message || ""
          if (apiMsg.toLowerCase().includes("upstream")) {
            errMsg = `Модель «${selectedModel.label}» сейчас недоступна. Попробуйте другую.`
          } else if (apiMsg) {
            errMsg = apiMsg
          }
        } catch {}
        throw new Error(errMsg)
      }

      const data = await response.json()

      if (data.setupRequired) {
        throw new Error("Не настроен API ключ для нейросетей на сервере (отсутствует OPENAI_API_KEY в .env).")
      }
      
      setMessages(prev => [
        ...prev,
        {
          id: `msg-assistant-${prev.length}`,
          role: "assistant",
          content: data.content || "Ассистент вернул пустой ответ.",
          createdAt: new Date(),
          model: selectedModel.id,
        }
      ])
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Не удалось отправить сообщение. Проверьте соединение.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleClear() {
    if (window.confirm("Очистить историю диалога с ассистентом?")) {
      setMessages([])
      setError("")
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 62)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-y-auto">
        <SiteHeader title="AI Ассистент" />
        
        <main className="flex flex-1 flex-col gap-6 p-4 pb-28 md:p-6 xl:px-8 max-w-5xl mx-auto w-full">
          <Card className="flex flex-col min-h-[calc(100svh-var(--header-height)-10rem)] border border-border/80 bg-background/50 backdrop-blur-md shadow-md rounded-2xl overflow-hidden">
            
            {/* Header */}
            <CardHeader className="border-b py-3 px-4 flex flex-row items-center justify-between gap-4 shrink-0 bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary animate-pulse">
                  <BotIcon className="size-5" />
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight">
                    Ассистент Factory 1.0
                  </CardTitle>
                  <CardDescription className="text-[11px] leading-tight mt-0.5">
                    Интеллектуальный помощник компании
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ModelSelector selected={selectedModel} onChange={(m) => {
                  setSelectedModel(m)
                }} />
                {messages.length > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon-sm" 
                    title="Очистить чат"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleClear}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Chat Body */}
            <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center max-w-xl mx-auto">
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
                    <SparklesIcon className="size-8 animate-wiggle" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight mb-2">
                    Добро пожаловать в AI Ассистент!
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    Я помогу сориентироваться на портале. Я знаю вашу учетную запись, могу отобразить ваши текущие задачи, последние новости и рассказать о коллегах.
                  </p>
                  <p className="text-xs text-muted-foreground mb-8">
                    Модель: <span className="font-medium text-foreground">{selectedModel.label}</span> — {selectedModel.description}
                  </p>
                  
                  <div className="grid gap-3 sm:grid-cols-2 w-full">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s.text)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all text-left text-xs cursor-pointer group"
                      >
                        <span className="mt-0.5 shrink-0 group-hover:scale-110 transition-transform">{s.icon}</span>
                        <span className="font-medium text-foreground">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message) => {
                    const isMine = message.role === "user"
                    const msgModel = !isMine && message.model
                      ? MODELS.find(m => m.id === message.model)
                      : null
                    
                    return (
                      <div key={message.id} className={cn("flex gap-3", isMine && "justify-end")}>
                        {!isMine && (
                          <Avatar className="size-8 border bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            <AvatarFallback>
                              <BotIcon className="size-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("flex flex-col max-w-[80%]", isMine && "items-end")}>
                          <div className={cn(
                            "rounded-2xl px-4 py-2.5 shadow-xs border text-sm leading-6",
                            isMine 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted/40 border-border text-foreground"
                          )}>
                            {isMine ? (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <div 
                                className="prose prose-sm dark:prose-invert break-words" 
                                dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }} 
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 px-1">
                            <span className="text-[10px] text-muted-foreground">
                              {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msgModel && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                {msgModel.icon}
                                {msgModel.label}
                              </span>
                            )}
                          </div>
                        </div>
                        {isMine && (
                          <Avatar className="size-8 border bg-primary/10 text-primary">
                            <AvatarFallback className="text-[10px]">
                              {currentUser ? getInitials(currentUser.name, currentUser.email) : "У"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )
                  })}
                  
                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="size-8 border bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        <AvatarFallback>
                          <BotIcon className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <div className="rounded-2xl px-4 py-3 bg-muted/40 border border-border flex items-center justify-center">
                          <div className="flex gap-1.5 items-center justify-center">
                            <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                            <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                            <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
                          {selectedModel.icon}
                          {selectedModel.label} думает...
                        </span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-xl max-w-md mx-auto text-center">
                      {error}
                    </div>
                  )}

                  <div ref={scrollRef} />
                </div>
              )}
            </CardContent>

            {/* Input Form */}
            <form 
              className="border-t p-3 bg-muted/5 flex items-center gap-2 shrink-0"
              onSubmit={(e) => {
                e.preventDefault()
                handleSend(inputValue)
              }}
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Спросите ${selectedModel.label}...`}
                disabled={isLoading}
                maxLength={2000}
                className="flex-1 h-10 px-4 rounded-xl border border-border/80 bg-background/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-55"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !inputValue.trim()}
                className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                <SendIcon className="size-4" />
                <span className="sr-only">Отправить</span>
              </Button>
            </form>

          </Card>
        </main>
        
        <MobileBottomNav 
          currentUser={currentUser ? { name: currentUser.name, email: currentUser.email } : null} 
          createLabel="Спросить ИИ"
          onCreatePost={() => handleSend("Помоги мне")}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

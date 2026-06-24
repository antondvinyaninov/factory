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
import * as pdfjsLib from "pdfjs-dist"
import { 
  SendIcon, 
  SparklesIcon, 
  BotIcon, 
  ChevronDownIcon,
  CheckIcon,
  ZapIcon,
  BrainIcon,
  UploadIcon,
  FileIcon,
  XIcon,
  PencilIcon,
  CheckIcon as CheckLineIcon,
  CopyIcon
} from "lucide-react"

// Конфигурация pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

type ChatUser = {
  id: string
  name: string
  email: string
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: any // array for multimodal
  createdAt: Date
  model?: string
}

type ModelOption = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  badge?: string
}

const MODELS: ModelOption[] = [
  { id: "gpt-5.5", label: "GPT-5.5 Vision", description: "OpenAI флагман", icon: <SparklesIcon className="size-3.5 text-green-500" />, badge: "Рекомендуем" },
  { id: "gpt-5.4", label: "GPT-5.4 Vision", description: "Быстрая модель", icon: <ZapIcon className="size-3.5 text-blue-500" /> },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", description: "Самая легкая", icon: <ZapIcon className="size-3.5 text-blue-400" /> },
]

function parseMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, "<li class='ml-4 list-disc my-1 text-sm'>$1</li>")
  html = html.replace(/\n/g, "<br />")
  return html
}

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
      >
        {selected.icon}
        <span className="max-w-[90px] truncate">{selected.label}</span>
        <ChevronDownIcon className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-1.5 flex flex-col gap-0.5 max-h-72 overflow-y-auto">
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m); setOpen(false) }}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all w-full",
                  selected.id === m.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                )}
              >
                <span className="shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">{m.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.description}</p>
                </div>
                {selected.id === m.id && <CheckIcon className="size-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EditableAssistantMessage({ messageId, initialContent, onSave }: { messageId: string, initialContent: string, onSave: (val: string) => void }) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [content, setContent] = React.useState(initialContent)
  const [copied, setCopied] = React.useState(false)

  // Обновляем контент, если он изменился снаружи (например, догрузился стрим)
  React.useEffect(() => {
    if (!isEditing) setContent(initialContent)
  }, [initialContent, isEditing])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 w-full min-w-[300px]">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full min-h-[150px] p-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { setContent(initialContent); setIsEditing(false) }}>
            Отмена
          </Button>
          <Button size="sm" onClick={() => { onSave(content); setIsEditing(false) }}>
            Сохранить
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group/edit">
      <div className="prose prose-sm dark:prose-invert break-words" dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
      
      <div className="absolute -top-3 -right-3 opacity-0 group-hover/edit:opacity-100 transition-opacity flex items-center gap-1 bg-background border shadow-sm rounded-lg p-0.5">
        <button
          onClick={handleCopy}
          title="Скопировать текст"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          {copied ? <CheckLineIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
        </button>
        <button
          onClick={() => setIsEditing(true)}
          title="Редактировать текст"
          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
        >
          <PencilIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function DocumentScannerPage() {
  const [currentUser, setCurrentUser] = React.useState<ChatUser | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [selectedModel, setSelectedModel] = React.useState<ModelOption>(MODELS[0])
  
  const [previewImages, setPreviewImages] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
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
      } catch (err) {}
    }
    void loadUser()
  }, [])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
        const numPages = pdf.numPages
        const images: string[] = []

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2.0 })
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) throw new Error("Canvas not supported")
          
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          await page.render({ canvasContext: ctx, viewport }).promise
          
          images.push(canvas.toDataURL("image/jpeg", 0.8))
        }
        
        setPreviewImages(images)
        if (messages.length === 0 && !inputValue) {
          setInputValue("Пожалуйста, распознай текст из этого документа. Если что-то неразборчиво, укажи это в скобках [неразборчиво].")
        }
      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setPreviewImages([event.target?.result as string])
          if (messages.length === 0 && !inputValue) {
            setInputValue("Пожалуйста, распознай текст из этого документа. Если что-то неразборчиво, укажи это в скобках [неразборчиво].")
          }
        }
        reader.readAsDataURL(file)
      } else {
        alert("Пожалуйста, загрузите PDF или изображение (PNG, JPG)")
      }
    } catch (err) {
      console.error(err)
      alert("Ошибка при обработке файла")
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSend() {
    const trimmed = inputValue.trim()
    if ((!trimmed && previewImages.length === 0) || isLoading) return

    setError("")
    setIsLoading(true)

    let contentPayload: any = trimmed
    
    if (previewImages.length > 0) {
      contentPayload = []
      if (trimmed) {
        contentPayload.push({ type: "text", text: trimmed })
      } else {
        contentPayload.push({ type: "text", text: "Распознай текст на этих изображениях." })
      }
      previewImages.forEach(img => {
        contentPayload.push({
          type: "image_url",
          image_url: { url: img }
        })
      })
    }

    const userMessage: Message = {
      id: `msg-user-${messages.length}`,
      role: "user",
      content: contentPayload,
      createdAt: new Date()
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInputValue("")
    // setPreviewImage(null) - Убрали, чтобы скан оставался на экране

    try {
      const systemPromptOverride = `Ты — экспертный ИИ-сканер документов для корпоративного портала Factory 1.0. 
Tвоя задача — извлечь текст из загруженного документа максимально точно, буква в букву.
Строго запрещено фантазировать, додумывать слова или числа.
Если какой-то фрагмент текста неразборчив из-за качества скана, укажи это в скобках: [неразборчиво] или [неразборчиво: похоже на X].
Сохраняй структуру документа (таблицы, абзацы, списки) насколько это возможно в текстовом формате.`

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
          systemPromptOverride
        })
      })

      if (!response.ok) {
        let errMsg = "Не удалось получить ответ от ассистента."
        try {
          const rawText = await response.text()
          try {
            const errData = JSON.parse(rawText)
            const apiMsg = errData?.message || errData?.error?.message || ""
            if (apiMsg.toLowerCase().includes("upstream")) {
              errMsg = `Модель «${selectedModel.label}» сейчас недоступна. Попробуйте другую.`
            } else if (apiMsg) {
              errMsg = apiMsg
            }
          } catch {
            errMsg = `Ошибка сервера (${response.status}): ${rawText.substring(0, 100)}...`
          }
        } catch {}
        throw new Error(errMsg)
      }

      const data = await response.json()
      
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
    } catch (err: any) {
      setError(err.message || "Ошибка при обращении к серверу.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 62)", "--header-height": "calc(var(--spacing) * 12)" } as any}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-hidden flex flex-col">
        <SiteHeader title="Сканер Документов (OCR)" />
        
        <main className="flex-1 overflow-hidden p-4 md:p-6 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          
          <Card className="flex-1 flex flex-col bg-muted/20 border-border/60 overflow-hidden shadow-sm">
            <CardHeader className="py-3 px-4 border-b bg-background">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileIcon className="size-4" />
                Оригинал документа
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col relative overflow-y-auto bg-grid-black/[0.02] dark:bg-grid-white/[0.02]">
              {previewImages.length > 0 ? (
                <div className="relative p-4 w-full h-full flex flex-col items-center gap-4 min-h-[400px]">
                  {previewImages.map((img, idx) => (
                    <div key={idx} className="relative w-full flex justify-center">
                      <img src={img} alt={`Скан страница ${idx + 1}`} className="max-w-full object-contain rounded-md shadow-md border bg-white" />
                    </div>
                  ))}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-4 right-4 rounded-full shadow-lg sticky"
                    onClick={() => setPreviewImages([])}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center p-8 max-w-md">
                  <div className="size-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <UploadIcon className="size-8" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Загрузите скан или PDF</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Мы распознаем текст любой сложности с помощью выбранной нейросети.
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                    Выбрать файл
                  </Button>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col shadow-sm border-border/80 h-full max-h-[calc(100svh-var(--header-height)-2rem)]">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <BotIcon className="size-5 text-primary" />
                <CardTitle className="text-sm font-semibold">Результат сканирования</CardTitle>
              </div>
              <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0 bg-background">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm mt-12">
                  Загрузите документ и выберите модель для начала работы.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message) => {
                    const isMine = message.role === "user"
                    
                    let textContent = ""
                    if (Array.isArray(message.content)) {
                      textContent = message.content.find(i => i.type === "text")?.text || ""
                    } else {
                      textContent = message.content
                    }

                    return (
                      <div key={message.id} className={cn("flex gap-3", isMine && "justify-end")}>
                        {!isMine && (
                          <Avatar className="size-8 bg-indigo-50 text-indigo-600 border">
                            <AvatarFallback><BotIcon className="size-4" /></AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("flex flex-col max-w-[85%]", isMine && "items-end")}>
                          <div className={cn(
                            "rounded-2xl px-4 py-2.5 shadow-xs border text-sm leading-6 relative group/msg",
                            isMine ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border"
                          )}>
                            {isMine ? (
                              <p className="whitespace-pre-wrap">{textContent}</p>
                            ) : (
                              <EditableAssistantMessage 
                                messageId={message.id} 
                                initialContent={textContent} 
                                onSave={(newContent) => {
                                  setMessages(prev => prev.map(m => m.id === message.id ? { ...m, content: newContent } : m))
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {isLoading && (
                    <div className="flex gap-3 text-muted-foreground text-sm items-center">
                      <BotIcon className="size-4 animate-pulse" /> Обрабатываю документ...
                    </div>
                  )}

                  {error && (
                    <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-xl text-center">
                      {error}
                    </div>
                  )}

                  <div ref={scrollRef} />
                </div>
              )}
            </CardContent>

            <form 
              className="p-3 border-t bg-muted/10 shrink-0"
              onSubmit={(e) => { e.preventDefault(); handleSend() }}
            >
              <div className="flex items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Инструкция для ИИ (например: 'Извлеки только таблицу')"
                  disabled={isLoading || (previewImages.length === 0 && messages.length === 0)}
                  className="flex-1 bg-background"
                />
                <Button type="submit" disabled={isLoading || (!inputValue.trim() && previewImages.length === 0)} size="icon">
                  <SendIcon className="size-4" />
                </Button>
              </div>
            </form>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

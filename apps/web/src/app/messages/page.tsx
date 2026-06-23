"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  typographyStyles,
  TypographyMuted,
  TypographySmall,
} from "@/components/ui/typography"
import { getCurrentUserCached } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type ChatUser = {
  id: string
  name: string
  email: string
}

type CurrentUser = ChatUser & {
  role: "SUPER_ADMIN" | "ADMIN" | "USER"
}

type ChatMessage = {
  id: string
  content: string
  createdAt: string
  author: ChatUser
}

type ConversationParticipant = {
  id: string
  user: ChatUser
}

type ConversationItem = {
  id: string
  title: string | null
  isGroup: boolean
  createdAt: string
  updatedAt: string
  participants: ConversationParticipant[]
  lastMessage: ChatMessage | null
  unreadCount?: number
}

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
})

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api"
}

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

function getUserLabel(user?: ChatUser | null) {
  return user ? user.name || user.email : "Пользователь"
}

function getConversationTitle(
  conversation: ConversationItem,
  currentUser: CurrentUser | null,
) {
  if (conversation.title) {
    return conversation.title
  }

  const otherParticipants = conversation.participants
    .map((participant) => participant.user)
    .filter((user) => user.id !== currentUser?.id)

  if (otherParticipants.length === 0) {
    return "Заметки"
  }

  return otherParticipants.map(getUserLabel).join(", ")
}

function getConversationInitials(
  conversation: ConversationItem,
  currentUser: CurrentUser | null,
) {
  const title = getConversationTitle(conversation, currentUser)
  return getInitials(title, title)
}

function mergeMessages(
  currentMessages: ChatMessage[],
  nextMessages: ChatMessage[],
) {
  const messageById = new Map<string, ChatMessage>()

  currentMessages.forEach((message) => {
    messageById.set(message.id, message)
  })
  nextMessages.forEach((message) => {
    messageById.set(message.id, message)
  })

  return Array.from(messageById.values()).sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  )
}

function MessagesPageContent() {
  const searchParams = useSearchParams()
  const urlId = searchParams.get("id") ?? searchParams.get("conversationId")

  const [conversations, setConversations] = React.useState<ConversationItem[]>(
    [],
  )
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [users, setUsers] = React.useState<ChatUser[]>([])
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [activeConversationId, setActiveConversationId] = React.useState<
    string | null
  >(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState("")
  const activeConversationIdRef = React.useRef<string | null>(null)
  const messageCacheRef = React.useRef<Record<string, ChatMessage[]>>({})
  const pollCounterRef = React.useRef(0)

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ??
    null

  const saveMessages = React.useCallback(
    (conversationId: string, nextMessages: ChatMessage[]) => {
      messageCacheRef.current = {
        ...messageCacheRef.current,
        [conversationId]: nextMessages,
      }

      if (activeConversationIdRef.current === conversationId) {
        setMessages(nextMessages)
        setIsMessagesLoading(false)
      }
    },
    [],
  )

  const selectConversation = React.useCallback((conversationId: string) => {
    const cachedMessages = messageCacheRef.current[conversationId]

    activeConversationIdRef.current = conversationId
    setActiveConversationId(conversationId)
    setMessages(cachedMessages ?? [])
    setIsMessagesLoading(!cachedMessages)
    setConversations((current) =>
      current.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    )
  }, [setConversations])

  const loadConversations = React.useCallback(async () => {
    const response = await fetch(`${getApiBaseUrl()}/messages/conversations`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Failed to load conversations")
    }

    const payload = (await response.json()) as { items?: ConversationItem[] }
    const nextConversations = payload.items ?? []
    setConversations(nextConversations)

    setActiveConversationId((currentId) => {
      const targetId = urlId || currentId
      const nextId =
        targetId && nextConversations.some((item) => item.id === targetId)
          ? targetId
          : (nextConversations[0]?.id ?? null)

      activeConversationIdRef.current = nextId
      return nextId
    })

    return nextConversations
  }, [urlId])

  React.useEffect(() => {
    if (urlId && conversations.some((c) => c.id === urlId) && activeConversationId !== urlId) {
      const timeoutId = window.setTimeout(() => {
        selectConversation(urlId)
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [urlId, conversations, activeConversationId, selectConversation])

  const loadMessages = React.useCallback(
    async (
      conversationId: string,
      options: { incremental?: boolean; showLoader?: boolean } = {},
    ) => {
      if (
        options.showLoader &&
        activeConversationIdRef.current === conversationId
      ) {
        setIsMessagesLoading(true)
      }

      const cachedMessages = messageCacheRef.current[conversationId] ?? []
      const searchParams = new URLSearchParams()
      const lastMessage = cachedMessages.at(-1)

      if (options.incremental && lastMessage) {
        searchParams.set("after", lastMessage.createdAt)
      }

      const queryString = searchParams.toString()
      const response = await fetch(
        `${getApiBaseUrl()}/messages/conversations/${conversationId}/messages${
          queryString ? `?${queryString}` : ""
        }`,
        {
          credentials: "include",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to load messages")
      }

      const payload = (await response.json()) as { items?: ChatMessage[] }
      const fetchedMessages = payload.items ?? []
      const nextMessages =
        options.incremental && cachedMessages.length > 0
          ? mergeMessages(cachedMessages, fetchedMessages)
          : fetchedMessages
      saveMessages(conversationId, nextMessages)
      setConversations((current) =>
        current.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      )
      window.dispatchEvent(new CustomEvent("messages-read"))

      return nextMessages
    },
    [saveMessages, setConversations],
  )

  const loadInitialData = React.useCallback(async () => {
    setError("")

    try {
      const [nextCurrentUser, usersResponse] = await Promise.all([
        getCurrentUserCached(),
        fetch(`${getApiBaseUrl()}/messages/users`, { credentials: "include" }),
        loadConversations(),
      ])

      setCurrentUser(nextCurrentUser)

      if (usersResponse.ok) {
        const payload = (await usersResponse.json()) as { items?: ChatUser[] }
        setUsers(payload.items ?? [])
      }
    } catch {
      setError("Не удалось загрузить сообщения")
    } finally {
      setIsLoading(false)
    }
  }, [loadConversations])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInitialData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadInitialData])

  React.useEffect(() => {
    if (!activeConversationId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      activeConversationIdRef.current = activeConversationId

      const cachedMessages = messageCacheRef.current[activeConversationId]
      setMessages(cachedMessages ?? [])
      setIsMessagesLoading(!cachedMessages)

      void loadMessages(activeConversationId, {
        showLoader: !cachedMessages,
      }).catch(() => {
        if (activeConversationIdRef.current === activeConversationId) {
          setError("Не удалось загрузить сообщения")
          setIsMessagesLoading(false)
        }
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeConversationId, loadMessages])

  React.useEffect(() => {
    if (conversations.length === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      conversations.slice(0, 5).forEach((conversation) => {
        if (
          conversation.id === activeConversationIdRef.current ||
          messageCacheRef.current[conversation.id]
        ) {
          return
        }

        void loadMessages(conversation.id, { showLoader: false }).catch(
          () => undefined,
        )
      })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [conversations, loadMessages])

  React.useEffect(() => {
    if (!activeConversationId) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return
      }

      pollCounterRef.current += 1
      void loadMessages(activeConversationId, {
        incremental: true,
        showLoader: false,
      }).catch(() => undefined)

      if (pollCounterRef.current % 4 === 0) {
        void loadConversations()
      }
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [activeConversationId, loadConversations, loadMessages])

  async function handleCreateConversation(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setIsCreating(true)
    setError("")

    const form = event.currentTarget
    const formData = new FormData(form)
    const participantIds = formData
      .getAll("participantIds")
      .map((value) => String(value))
      .filter(Boolean)

    if (participantIds.length === 0) {
      setError("Выберите хотя бы одного участника")
      setIsCreating(false)
      return
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/messages/conversations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(formData.get("title") ?? "").trim() || undefined,
          participantIds,
        }),
      })

      if (!response.ok) {
        setError("Не удалось создать чат")
        return
      }

      const payload = (await response.json()) as { item: ConversationItem }
      setConversations((currentItems) => {
        const withoutDuplicate = currentItems.filter(
          (item) => item.id !== payload.item.id,
        )
        return [payload.item, ...withoutDuplicate]
      })
      messageCacheRef.current = {
        ...messageCacheRef.current,
        [payload.item.id]: [],
      }
      selectConversation(payload.item.id)
      form.reset()
      setIsCreateOpen(false)
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeConversationId) {
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const content = String(formData.get("content") ?? "").trim()

    if (!content) {
      return
    }

    setIsSending(true)
    setError("")

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/messages/conversations/${activeConversationId}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        },
      )

      if (!response.ok) {
        setError("Не удалось отправить сообщение")
        return
      }

      const payload = (await response.json()) as { item: ChatMessage }
      setMessages((currentMessages) => {
        const nextMessages = [...currentMessages, payload.item]

        messageCacheRef.current = {
          ...messageCacheRef.current,
          [activeConversationId]: nextMessages,
        }

        return nextMessages
      })
      form.reset()
      void loadConversations()
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsSending(false)
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
        <SiteHeader title="Сообщения" />
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader className="border-b">
              <DialogTitle className={typographyStyles.large}>
                Новый чат
              </DialogTitle>
              <DialogDescription className={typographyStyles.muted}>
                Выберите участников для личной или групповой переписки.
              </DialogDescription>
            </DialogHeader>
            <form className="grid gap-4 p-4" onSubmit={handleCreateConversation}>
              <Input name="title" placeholder="Название чата, если нужен групповой" />
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border p-2">
                {users.length > 0 ? (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        name="participantIds"
                        value={user.id}
                      />
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {getUserLabel(user)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <TypographyMuted className="px-3 py-6 text-center">
                    Нет доступных пользователей.
                  </TypographyMuted>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Создаём..." : "Создать чат"}
                </Button>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <main className="flex flex-1 flex-col gap-6 p-4 pb-28 md:p-6 xl:px-8">
          <div className="grid w-full gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <aside className="grid gap-4 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)] xl:max-h-[calc(100svh-var(--header-height)-3rem)] xl:self-start xl:overflow-y-auto">
              <Card size="sm" className="bg-primary/5">
                <CardContent className="grid gap-3">
                  <Button
                    type="button"
                    size="lg"
                    className="h-11 justify-start gap-2"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <PlusIcon className="size-4" />
                    Новый чат
                  </Button>
                  <TypographyMuted className="text-xs">
                    Первая версия сообщений работает через периодическое
                    обновление.
                  </TypographyMuted>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircleIcon className="size-4 text-muted-foreground" />
                    Диалоги
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {isLoading ? (
                    <TypographyMuted>Загружаем чаты...</TypographyMuted>
                  ) : null}
                  {!isLoading && conversations.length === 0 ? (
                    <div className="grid gap-2 rounded-xl border border-dashed p-4 text-center">
                      <UsersIcon className="mx-auto size-8 text-muted-foreground" />
                      <TypographyMuted>
                        Пока нет активных чатов.
                      </TypographyMuted>
                    </div>
                  ) : null}
                  {conversations.map((conversation) => {
                    const isActive = conversation.id === activeConversationId
                    const title = getConversationTitle(
                      conversation,
                      currentUser,
                    )

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted",
                          isActive &&
                            "bg-primary text-primary-foreground hover:bg-primary",
                        )}
                        onClick={() => selectConversation(conversation.id)}
                      >
                        <Avatar className="size-9">
                          <AvatarFallback
                            className={cn(
                              "text-xs",
                              isActive && "bg-primary-foreground text-primary",
                            )}
                          >
                            {getConversationInitials(conversation, currentUser)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="block truncate text-sm font-medium">
                              {title}
                            </span>
                            {conversation.unreadCount && conversation.unreadCount > 0 && !isActive ? (
                              <span className="flex size-2 shrink-0 items-center justify-center rounded-full bg-red-500" />
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "line-clamp-2 text-xs text-muted-foreground",
                              isActive && "text-primary-foreground/80",
                            )}
                          >
                            {conversation.lastMessage
                              ? conversation.lastMessage.content
                              : "Нет сообщений"}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </aside>
            <section className="min-w-0">
              <Card className="min-h-[calc(100svh-var(--header-height)-8rem)] overflow-hidden">
                {activeConversation ? (
                  <>
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className={typographyStyles.h3}>
                            {getConversationTitle(
                              activeConversation,
                              currentUser,
                            )}
                          </CardTitle>
                          <CardDescription className={typographyStyles.muted}>
                            Участников: {activeConversation.participants.length}
                          </CardDescription>
                        </div>
                        {activeConversation.isGroup ? (
                          <Badge variant="outline">Группа</Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="grid min-h-[520px] grid-rows-[1fr_auto] gap-4 p-4">
                      <div className="grid content-end gap-3 overflow-y-auto rounded-xl bg-muted/25 p-3">
                        {messages.length === 0 ? (
                          <div className="grid place-items-center py-16 text-center">
                            <div className="grid gap-2">
                              <SearchIcon className="mx-auto size-8 text-muted-foreground" />
                              <TypographyMuted>
                                {isMessagesLoading
                                  ? "Загружаем сообщения..."
                                  : "Сообщений пока нет. Напишите первым."}
                              </TypographyMuted>
                            </div>
                          </div>
                        ) : null}
                        {messages.map((message) => {
                          const isMine = message.author.id === currentUser?.id

                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex gap-2",
                                isMine && "justify-end",
                              )}
                            >
                              {!isMine ? (
                                <Avatar className="size-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(
                                      message.author.name,
                                      message.author.email,
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                              ) : null}
                              <div
                                className={cn(
                                  "max-w-[min(34rem,80%)] rounded-2xl border bg-background px-3 py-2 shadow-xs",
                                  isMine &&
                                    "border-primary bg-primary text-primary-foreground",
                                )}
                              >
                                {!isMine ? (
                                  <TypographySmall>
                                    {getUserLabel(message.author)}
                                  </TypographySmall>
                                ) : null}
                                <p className="whitespace-pre-wrap text-sm leading-6">
                                  {message.content}
                                </p>
                                <div
                                  className={cn(
                                    "mt-1 text-right text-[11px] text-muted-foreground",
                                    isMine && "text-primary-foreground/70",
                                  )}
                                >
                                  {timeFormatter.format(
                                    new Date(message.createdAt),
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <form
                        className="flex items-end gap-2"
                        onSubmit={handleSendMessage}
                      >
                        <textarea
                          name="content"
                          placeholder="Написать сообщение"
                          maxLength={5000}
                          className="min-h-11 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isSending}
                        />
                        <Button
                          type="submit"
                          size="icon-lg"
                          disabled={isSending}
                        >
                          <SendIcon />
                          <span className="sr-only">Отправить</span>
                        </Button>
                      </form>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="grid min-h-[520px] place-items-center text-center">
                    <div className="grid gap-3">
                      <MessageCircleIcon className="mx-auto size-12 text-muted-foreground" />
                      <CardTitle>Выберите чат</CardTitle>
                      <TypographyMuted>
                        Создайте новый диалог или выберите существующий.
                      </TypographyMuted>
                    </div>
                  </CardContent>
                )}
              </Card>
            </section>
          </div>
        </main>
        <MobileBottomNav
          currentUser={currentUser}
          createLabel="Новый чат"
          onCreatePost={() => setIsCreateOpen(true)}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function MessagesPage() {
  return (
    <React.Suspense fallback={<div>Загрузка сообщений...</div>}>
      <MessagesPageContent />
    </React.Suspense>
  )
}

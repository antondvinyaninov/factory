"use client"

import * as React from "react"
import Image from "next/image"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  EllipsisVerticalIcon,
  FileTextIcon,
  PaperclipIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react"
import {
  typographyStyles,
  TypographyH2,
  TypographyMuted,
  TypographyProse,
  TypographySmall,
} from "@/components/ui/typography"

type NewsAttachment = {
  id: string
  name: string
  mimeType: string
  size: number
  url: string
  kind: "image" | "video" | "document"
}

type NewsPost = {
  id: string
  title: string
  content: string
  attachments?: NewsAttachment[]
  publishedAt: string | null
  createdAt: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

type CurrentUser = {
  id: string
  name: string
  email: string
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function getInitials(name: string, email: string) {
  const source = name || email
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} КБ`
  }

  return `${(size / 1024 / 1024).toFixed(1)} МБ`
}

function NewsAttachments({ attachments }: { attachments: NewsAttachment[] }) {
  const images = attachments.filter((attachment) => attachment.kind === "image")
  const videos = attachments.filter((attachment) => attachment.kind === "video")
  const documents = attachments.filter(
    (attachment) => attachment.kind === "document",
  )

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-lg border bg-muted/30"
            >
              <Image
                src={attachment.url}
                alt={attachment.name}
                width={800}
                height={450}
                unoptimized
                className="h-56 w-full object-cover transition-transform hover:scale-[1.02]"
              />
            </a>
          ))}
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div className="grid gap-3">
          {videos.map((attachment) => (
            <video
              key={attachment.id}
              src={attachment.url}
              controls
              className="max-h-[420px] w-full rounded-lg border bg-black"
            />
          ))}
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="grid gap-2">
          {documents.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileTextIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {attachment.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function NewsPage() {
  const [items, setItems] = React.useState<NewsPost[]>([])
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState("")
  const [editingContent, setEditingContent] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [savingId, setSavingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")

  const loadCurrentUser = React.useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/me`,
        {
          credentials: "include",
        },
      )

      if (!response.ok) {
        return
      }

      const payload = (await response.json()) as { user?: CurrentUser }
      setCurrentUser(payload.user ?? null)
    } catch {
      setCurrentUser(null)
    }
  }, [])

  const loadNews = React.useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news`,
        {
          credentials: "include",
        },
      )

      if (!response.ok) {
        setError("Не удалось загрузить новости")
        return
      }

      const payload = (await response.json()) as { items?: NewsPost[] }
      setItems(payload.items ?? [])
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCurrentUser()
      void loadNews()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCurrentUser, loadNews])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsPublishing(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      )

      if (!response.ok) {
        setError("Не удалось опубликовать новость")
        return
      }

      form.reset()
      await loadNews()
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsPublishing(false)
    }
  }

  function startEditing(item: NewsPost) {
    setError("")
    setEditingId(item.id)
    setEditingTitle(item.title)
    setEditingContent(item.content)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingTitle("")
    setEditingContent("")
  }

  async function handleUpdate(itemId: string) {
    setError("")
    setSavingId(itemId)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news/${itemId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editingTitle,
            content: editingContent,
          }),
        },
      )

      if (!response.ok) {
        setError("Не удалось сохранить новость")
        return
      }

      cancelEditing()
      await loadNews()
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(itemId: string) {
    if (!window.confirm("Удалить эту новость?")) {
      return
    }

    setError("")
    setDeletingId(itemId)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/news/${itemId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      )

      if (!response.ok) {
        setError("Не удалось удалить новость")
        return
      }

      if (editingId === itemId) {
        cancelEditing()
      }

      await loadNews()
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setDeletingId(null)
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
      <SidebarInset>
        <SiteHeader title="Новости" />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle className={typographyStyles.large}>
                Опубликовать новость
              </CardTitle>
              <CardDescription className={typographyStyles.muted}>
                Создайте объявление для сотрудников портала.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <Input
                  name="title"
                  placeholder="Заголовок новости"
                  minLength={3}
                  required
                />
                <textarea
                  name="content"
                  placeholder="Текст новости"
                  minLength={10}
                  required
                  className="min-h-32 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex flex-col gap-2">
                  <TypographySmall className="flex items-center gap-2">
                    <PaperclipIcon className="size-4" />
                    Вложения
                  </TypographySmall>
                  <Input
                    name="attachments"
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="cursor-pointer"
                  />
                  <TypographyMuted className="text-xs">
                    Можно прикрепить до 8 файлов: фото, видео или документы до 50
                    МБ каждый.
                  </TypographyMuted>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isPublishing}>
                    {isPublishing ? "Публикуем..." : "Опубликовать"}
                  </Button>
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-4">
            <div>
              <TypographyH2 className="text-xl">
                Лента новостей
              </TypographyH2>
              <TypographyMuted>
                Последние опубликованные объявления и сообщения.
              </TypographyMuted>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="text-muted-foreground">
                  Загружаем новости...
                </CardContent>
              </Card>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground">
                  Новостей пока нет. Опубликуйте первую запись.
                </CardContent>
              </Card>
            ) : null}

            {items.map((item) => {
              const isAuthor = item.author.id === currentUser?.id
              const isEditing = editingId === item.id
              const attachments = item.attachments ?? []

              return (
                <Card key={item.id}>
                  <CardHeader className="gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar size="lg">
                          {item.author.avatar ? (
                            <AvatarImage
                              src={item.author.avatar}
                              alt={item.author.name || item.author.email}
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 font-medium text-primary">
                            {getInitials(item.author.name, item.author.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {item.author.name || item.author.email}
                          </div>
                          <CardDescription className={typographyStyles.muted}>
                            {dateFormatter.format(
                              new Date(item.publishedAt ?? item.createdAt),
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      {isAuthor ? (
                        <div className="flex shrink-0 items-center gap-2">
                          {isEditing ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={cancelEditing}
                            >
                              Отмена
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground data-open:bg-muted"
                                  />
                                }
                              >
                                <EllipsisVerticalIcon />
                                <span className="sr-only">
                                  Действия с новостью
                                </span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => startEditing(item)}
                                >
                                  <PencilIcon />
                                  <span>Редактировать</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={deletingId === item.id}
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <TrashIcon />
                                  <span>
                                    {deletingId === item.id
                                      ? "Удаляем..."
                                      : "Удалить"}
                                  </span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <Input
                        value={editingTitle}
                        minLength={3}
                        onChange={(event) => setEditingTitle(event.target.value)}
                      />
                    ) : (
                      <CardTitle className={typographyStyles.h3}>
                        {item.title}
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="flex flex-col gap-3">
                        <textarea
                          value={editingContent}
                          minLength={10}
                          className="min-h-32 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                          onChange={(event) =>
                            setEditingContent(event.target.value)
                          }
                        />
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            disabled={savingId === item.id}
                            onClick={() => handleUpdate(item.id)}
                          >
                            {savingId === item.id ? "Сохраняем..." : "Сохранить"}
                          </Button>
                          {error ? (
                            <p className="text-sm text-destructive">{error}</p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <TypographyProse>
                        {item.content}
                      </TypographyProse>
                    )}
                    {attachments.length > 0 ? (
                      <div className="mt-5">
                        <NewsAttachments attachments={attachments} />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

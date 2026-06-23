"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  CircleFadingArrowUpIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HeartIcon,
  ImageIcon,
  MessageCircleIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TrashIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCurrentUserCached } from "@/lib/auth-client"
import {
  typographyStyles,
  TypographyMuted,
  TypographyProse,
  TypographySmall,
} from "@/components/ui/typography"

import type { NewsAttachment, NewsComment, NewsPost, SelectedNewsFile, CurrentUser } from "@/types/news"
import { NewsPostCard } from "@/components/news-post-card"

type NewsFeedFilter = "all" | "attachments" | "images" | "documents" | "mine"

const NEWS_CACHE_KEY = "factory-news-cache"

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

function getSelectedFileKind(file: File): NewsAttachment["kind"] {
  if (file.type.startsWith("image/")) {
    return "image"
  }

  if (file.type.startsWith("video/")) {
    return "video"
  }

  return "document"
}

function createSelectedNewsFiles(files: File[]): SelectedNewsFile[] {
  return files.map((file, index) => {
    const kind = getSelectedFileKind(file)

    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
      file,
      kind,
      previewUrl:
        kind === "image" || kind === "video" ? URL.createObjectURL(file) : null,
    }
  })
}

function revokeSelectedFileUrls(files: SelectedNewsFile[]) {
  files.forEach((item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
  })
}

function canPreviewDocument(attachment: NewsAttachment) {
  return (
    attachment.mimeType === "application/pdf" ||
    attachment.mimeType.startsWith("text/")
  )
}

function newsPostHasAttachmentKind(
  item: NewsPost,
  kind: NewsAttachment["kind"],
) {
  return item.attachments?.some((attachment) => attachment.kind === kind) ?? false
}

function isImportantNewsPost(item: NewsPost) {
  const title = item.title.trim().toLowerCase()
  const content = item.content.trim().toLowerCase()
  return (
    item.isImportant === true ||
    title.startsWith("важно") ||
    content.includes("#важно")
  )
}

function sortNewsPosts(items: NewsPost[]) {
  return [...items].sort((first, second) => {
    const firstImportant = isImportantNewsPost(first)
    const secondImportant = isImportantNewsPost(second)

    if (firstImportant !== secondImportant) {
      return firstImportant ? -1 : 1
    }

    return (
      new Date(second.publishedAt ?? second.createdAt).getTime() -
      new Date(first.publishedAt ?? first.createdAt).getTime()
    )
  })
}

function normalizePostComments(comments: NewsComment[] = []) {
  const commentById = new Map<string, NewsComment>()

  comments.forEach((comment) => {
    commentById.set(comment.id, {
      ...comment,
      replies: [...(comment.replies ?? [])],
    })
  })

  const rootComments: NewsComment[] = []

  commentById.forEach((comment) => {
    if (comment.parentId && commentById.has(comment.parentId)) {
      const parent = commentById.get(comment.parentId)
      if (parent) {
        parent.replies = [
          ...(parent.replies ?? []).filter((reply) => reply.id !== comment.id),
          comment,
        ]
      }
      return
    }

    rootComments.push(comment)
  })

  return rootComments.map((comment) => ({
    ...comment,
    replies: [...(comment.replies ?? [])].sort(
      (first, second) =>
        new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
    ),
  }))
}

function normalizeNewsPosts(items: NewsPost[]) {
  return items.map((item) => ({
    ...item,
    comments: normalizePostComments(item.comments),
  }))
}

function readCachedNews() {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const cachedValue = window.sessionStorage.getItem(NEWS_CACHE_KEY)
    if (!cachedValue) {
      return []
    }

    const payload = JSON.parse(cachedValue) as { items?: NewsPost[] }
    return normalizeNewsPosts(payload.items ?? [])
  } catch {
    return []
  }
}

function cacheNews(items: NewsPost[]) {
  try {
    window.sessionStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ items }))
  } catch {
    // Ignore cache write errors.
  }
}

function NewsFeedSidebar({
  activeFilter,
  counts,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: {
  activeFilter: NewsFeedFilter
  counts: Record<NewsFeedFilter, number>
  searchQuery: string
  onFilterChange: (filter: NewsFeedFilter) => void
  onSearchChange: (query: string) => void
}) {
  const filters: Array<{
    value: NewsFeedFilter
    label: string
    icon: LucideIcon
  }> = [
    {
      value: "all",
      label: "Лента",
      icon: SparklesIcon,
    },
    {
      value: "images",
      label: "Фотографии",
      icon: ImageIcon,
    },
    {
      value: "documents",
      label: "Документы",
      icon: FileTextIcon,
    },
    {
      value: "attachments",
      label: "С файлами",
      icon: PaperclipIcon,
    },
    {
      value: "mine",
      label: "Мои записи",
      icon: HeartIcon,
    },
  ]

  return (
    <div className="grid gap-4">
      <Card size="sm" className="bg-muted/20">
        <CardContent className="grid gap-1 p-2">
          {filters.map((filter) => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.value

            return (
              <Button
                key={filter.value}
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                className="h-11 justify-between rounded-lg px-3 text-left"
                onClick={() => onFilterChange(filter.value)}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{filter.label}</span>
                </span>
                <Badge variant={isActive ? "default" : "outline"}>
                  {counts[filter.value]}
                </Badge>
              </Button>
            )
          })}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
            Поиск по ленте
          </CardTitle>
          <CardDescription>
            Найдите запись по заголовку, тексту или автору.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              placeholder="Поиск новости"
              className="pl-9"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Важно</CardTitle>
          <CardDescription>
            Закреплённая информация для сотрудников.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-28 rounded-lg border border-dashed bg-muted/20" />
        </CardContent>
      </Card>

    </div>
  )
}

function NewsPageContent() {
  const searchParams = useSearchParams()
  const urlId = searchParams.get("id") ?? searchParams.get("postId")

  const [items, setItems] = React.useState<NewsPost[]>([])
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
        const [selectedFiles, setSelectedFiles] = React.useState<SelectedNewsFile[]>(
    [],
  )
  const [previewAttachment, setPreviewAttachment] =
    React.useState<NewsAttachment | null>(null)
  const [feedFilter, setFeedFilter] = React.useState<NewsFeedFilter>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isComposerOpen, setIsComposerOpen] = React.useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isPublishing, setIsPublishing] = React.useState(false)
        const [replyingToCommentId, setReplyingToCommentId] = React.useState<
    string | null
  >(null)
  const [expandedCommentPostIds, setExpandedCommentPostIds] = React.useState<
    string[]
  >([])
  const [error, setError] = React.useState("")
  const attachmentsInputRef = React.useRef<HTMLInputElement>(null)
  const selectedFilesRef = React.useRef<SelectedNewsFile[]>([])
  const hadCachedNewsRef = React.useRef(false)
  const pendingLikeIdsRef = React.useRef(new Set<string>())

  const sortedItems = React.useMemo(() => sortNewsPosts(items), [items])

  const filterCounts = React.useMemo<Record<NewsFeedFilter, number>>(
    () => ({
      all: sortedItems.length,
      attachments: sortedItems.filter(
        (item) => (item.attachments?.length ?? 0) > 0,
      ).length,
      images: sortedItems.filter((item) =>
        newsPostHasAttachmentKind(item, "image"),
      ).length,
      documents: sortedItems.filter((item) =>
        newsPostHasAttachmentKind(item, "document"),
      ).length,
      mine: currentUser
        ? sortedItems.filter((item) => item.author.id === currentUser.id).length
        : 0,
    }),
    [currentUser, sortedItems],
  )

  const filteredItems = React.useMemo(() => {
    let nextItems: NewsPost[]

    switch (feedFilter) {
      case "attachments":
        nextItems = sortedItems.filter(
          (item) => (item.attachments?.length ?? 0) > 0,
        )
        break
      case "images":
        nextItems = sortedItems.filter((item) =>
          newsPostHasAttachmentKind(item, "image"),
        )
        break
      case "documents":
        nextItems = sortedItems.filter((item) =>
          newsPostHasAttachmentKind(item, "document"),
        )
        break
      case "mine":
        nextItems = currentUser
          ? sortedItems.filter((item) => item.author.id === currentUser.id)
          : []
        break
      case "all":
      default:
        nextItems = sortedItems
    }

    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return nextItems
    }

    return nextItems.filter((item) => {
      const author = item.author.name || item.author.email
      return [item.title, item.content, author]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [currentUser, feedFilter, searchQuery, sortedItems])

  const loadCurrentUser = React.useCallback(async () => {
    try {
      setCurrentUser(await getCurrentUserCached())
    } catch {
      setCurrentUser(null)
    }
  }, [])

  const loadNews = React.useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true)
    }
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
      const nextItems = normalizeNewsPosts(payload.items ?? [])
      setItems(nextItems)
      cacheNews(nextItems)
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateNewsItems = React.useCallback(
    (updater: (currentItems: NewsPost[]) => NewsPost[]) => {
      setItems((currentItems) => {
        const nextItems = normalizeNewsPosts(updater(currentItems))
        cacheNews(nextItems)

        return nextItems
      })
    },
    [],
  )

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const cachedItems = readCachedNews()
      hadCachedNewsRef.current = cachedItems.length > 0

      if (cachedItems.length > 0) {
        setItems(cachedItems)
        setIsLoading(false)
      }

      void loadCurrentUser()
      void loadNews(!hadCachedNewsRef.current)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCurrentUser, loadNews])

  React.useEffect(() => {
    if (urlId) {
      const timeoutId = window.setTimeout(() => {
        const element = document.getElementById(`post-${urlId}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          element.classList.add("ring-2", "ring-primary", "ring-offset-2")
          const timerId = window.setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2")
          }, 3000)
          return () => window.clearTimeout(timerId)
        }
      }, 100)
      return () => window.clearTimeout(timeoutId)
    }
  }, [urlId, items])

  React.useEffect(() => {
    selectedFilesRef.current = selectedFiles
  }, [selectedFiles])

  React.useEffect(() => {
    return () => revokeSelectedFileUrls(selectedFilesRef.current)
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsPublishing(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.delete("attachments")
    selectedFiles.forEach((item) => {
      formData.append("attachments", item.file)
    })

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

      const payload = (await response.json()) as { item: NewsPost }
      const nextItem = normalizeNewsPosts([
        {
          ...payload.item,
          comments: [],
          commentsCount: 0,
          likedByMe: false,
          likesCount: 0,
        },
      ])[0]

      form.reset()
      clearSelectedFiles()
      setIsComposerOpen(false)
      updateNewsItems((currentItems) => [nextItem, ...currentItems])
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsPublishing(false)
    }
  }

  function handleAttachmentsChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = createSelectedNewsFiles(Array.from(event.target.files ?? []))

    setSelectedFiles((currentFiles) => {
      revokeSelectedFileUrls(currentFiles)
      return files
    })
  }

  function clearSelectedFiles() {
    if (attachmentsInputRef.current) {
      attachmentsInputRef.current.value = ""
    }

    setSelectedFiles((currentFiles) => {
      revokeSelectedFileUrls(currentFiles)
      return []
    })
  }

  function removeSelectedFile(fileId: string) {
    if (attachmentsInputRef.current) {
      attachmentsInputRef.current.value = ""
    }

    setSelectedFiles((currentFiles) => {
      const fileToRemove = currentFiles.find((item) => item.id === fileId)

      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }

      return currentFiles.filter((item) => item.id !== fileId)
    })
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
        <SiteHeader title="Лента" onOpenFilters={() => setIsFiltersOpen(true)} />
                <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetContent
            side="left"
            className="w-[min(420px,calc(100vw-1rem))] overflow-y-auto p-4"
          >
            <SheetHeader className="px-0 pt-0">
              <SheetTitle>Фильтры ленты</SheetTitle>
              <SheetDescription>
                Отберите записи и найдите нужную новость.
              </SheetDescription>
            </SheetHeader>
            <NewsFeedSidebar
              activeFilter={feedFilter}
              counts={filterCounts}
              searchQuery={searchQuery}
              onFilterChange={setFeedFilter}
              onSearchChange={setSearchQuery}
            />
          </SheetContent>
        </Sheet>
        <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="border-b">
            <DialogTitle className={typographyStyles.large}>
                Опубликовать новость
            </DialogTitle>
            <DialogDescription className={typographyStyles.muted}>
                Создайте объявление для сотрудников портала.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto p-4">
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
                    ref={attachmentsInputRef}
                    id="news-attachments"
                    name="attachments"
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="sr-only"
                    onChange={handleAttachmentsChange}
                  />
                  <label
                    htmlFor="news-attachments"
                    className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        buttonVariants({ variant: "outline", size: "icon" }),
                        "size-11 rounded-xl bg-background",
                      )}
                      aria-hidden="true"
                    >
                      <CircleFadingArrowUpIcon className="size-5" />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        Добавить медиа или документы
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Нажмите, чтобы выбрать файлы
                      </span>
                    </span>
                  </label>
                  <TypographyMuted className="text-xs">
                    Можно прикрепить до 8 файлов: фото, видео или документы до 50
                    МБ каждый.
                  </TypographyMuted>
                  {selectedFiles.length > 0 ? (
                    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <TypographySmall>
                          Выбрано файлов: {selectedFiles.length}
                        </TypographySmall>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearSelectedFiles}
                        >
                          Очистить всё
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedFiles.map((item) => (
                          <div
                            key={item.id}
                            className="group relative overflow-hidden rounded-xl border bg-background shadow-xs"
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon-sm"
                              className="absolute right-2 top-2 z-10 opacity-95 shadow-sm"
                              onClick={() => removeSelectedFile(item.id)}
                            >
                              <TrashIcon className="size-3.5" />
                              <span className="sr-only">Удалить файл</span>
                            </Button>
                            <div className="flex h-32 items-center justify-center bg-muted/40">
                              {item.kind === "image" && item.previewUrl ? (
                                <div
                                  className="h-full w-full bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url(${item.previewUrl})`,
                                  }}
                                />
                              ) : null}
                              {item.kind === "video" && item.previewUrl ? (
                                <video
                                  src={item.previewUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                />
                              ) : null}
                              {item.kind === "document" ? (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                  <FileTextIcon className="size-8" />
                                  <span className="text-xs">Документ</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="grid gap-1 p-3">
                              <span className="truncate text-sm font-medium">
                                {item.file.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(item.file.size)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
          </div>
        </DialogContent>
        </Dialog>
        <main className="flex flex-1 flex-col gap-6 p-4 pb-28 md:p-6">
          <div className="mx-auto grid w-full max-w-[1140px] gap-6 xl:grid-cols-[minmax(0,700px)_25rem] xl:justify-center">
            <section className="mx-auto flex w-full max-w-[700px] min-w-0 flex-col gap-4 xl:mx-0">
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

              {!isLoading && items.length > 0 && filteredItems.length === 0 ? (
                <Card>
                  <CardContent className="text-muted-foreground">
                    По выбранному фильтру новостей нет.
                  </CardContent>
                </Card>
              ) : null}

              {filteredItems.map((item) => (
                <NewsPostCard
                  key={item.id}
                  initialItem={item}
                  currentUser={currentUser}
                  onDelete={(id) => updateNewsItems((currentItems) => currentItems.filter((i) => i.id !== id))}
                />
              ))}
            </section>
            <aside className="mx-auto hidden w-full max-w-[760px] gap-4 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)] xl:grid xl:max-h-[calc(100svh-var(--header-height)-3rem)] xl:max-w-none xl:self-start xl:overflow-y-auto xl:px-1">
              <Card size="sm" className="bg-primary/5">
                <CardContent className="grid gap-3">
                  <Button
                    type="button"
                    size="lg"
                    className="h-11 justify-start gap-2"
                    onClick={() => setIsComposerOpen(true)}
                  >
                    <PlusIcon className="size-4" />
                    Добавить новость
                  </Button>
                  <TypographyMuted className="text-xs">
                    Создайте объявление, прикрепите фото, видео или документ.
                  </TypographyMuted>
                </CardContent>
              </Card>
              <NewsFeedSidebar
                activeFilter={feedFilter}
                counts={filterCounts}
                searchQuery={searchQuery}
                onFilterChange={setFeedFilter}
                onSearchChange={setSearchQuery}
              />
            </aside>
          </div>
        </main>
        <MobileBottomNav
          currentUser={currentUser}
          onCreatePost={() => setIsComposerOpen(true)}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function NewsPage() {
  return (
    <React.Suspense fallback={<div>Загрузка ленты...</div>}>
      <NewsPageContent />
    </React.Suspense>
  )
}

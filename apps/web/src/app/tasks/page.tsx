"use client"

import * as React from "react"
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClipboardListIcon,
  Clock3Icon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  typographyStyles,
  TypographyMuted,
  TypographySmall,
} from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED"
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER"
type TaskFilter = "all" | "mine" | "assigned" | TaskStatus

type TaskUser = {
  id: string
  name: string
  email: string
}

type CurrentUser = TaskUser & {
  role: UserRole
}

type TaskItem = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueAt: string | null
  createdAt: string
  updatedAt: string
  creator: TaskUser
  assignee: TaskUser | null
}

type TasksCachePayload = {
  items?: TaskItem[]
  users?: TaskUser[]
  currentUser?: CurrentUser | null
}

const TASKS_CACHE_KEY = "factory-tasks-cache"

const statusLabels: Record<TaskStatus, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  DONE: "Готово",
  CANCELED: "Отменено",
}

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  URGENT: "Срочно",
}

const statusOptions: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELED",
]

const priorityOptions: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"]

const taskFilterItems: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "Все задачи" },
  { value: "assigned", label: "Назначены мне" },
  { value: "mine", label: "Созданные мной" },
  { value: "TODO", label: statusLabels.TODO },
  { value: "IN_PROGRESS", label: statusLabels.IN_PROGRESS },
  { value: "DONE", label: statusLabels.DONE },
]

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function getUserLabel(user?: TaskUser | null) {
  return user ? user.name || user.email : "Не назначен"
}

function getStatusBadgeClass(status: TaskStatus) {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
    case "IN_PROGRESS":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
    case "CANCELED":
      return "border-muted bg-muted text-muted-foreground"
    case "TODO":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
  }
}

function getPriorityBadgeClass(priority: TaskPriority) {
  switch (priority) {
    case "URGENT":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
    case "LOW":
      return "border-muted bg-muted text-muted-foreground"
    case "MEDIUM":
    default:
      return "border-border bg-background text-foreground"
  }
}

function isOverdue(task: TaskItem) {
  return Boolean(
    task.dueAt &&
      task.status !== "DONE" &&
      task.status !== "CANCELED" &&
      new Date(task.dueAt).getTime() < Date.now(),
  )
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api"
}

function readCachedTasks(): TasksCachePayload {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const cachedValue = window.sessionStorage.getItem(TASKS_CACHE_KEY)
    return cachedValue ? (JSON.parse(cachedValue) as TasksCachePayload) : {}
  } catch {
    return {}
  }
}

function cacheTasks(payload: TasksCachePayload) {
  try {
    window.sessionStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore cache write errors.
  }
}

function TasksFiltersPanel({
  activeFilter,
  counts,
  overdueCount,
  onFilterChange,
}: {
  activeFilter: TaskFilter
  counts: Record<TaskFilter, number>
  overdueCount: number
  onFilterChange: (filter: TaskFilter) => void
}) {
  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {taskFilterItems.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                activeFilter === filter.value &&
                  "bg-primary text-primary-foreground hover:bg-primary",
              )}
              onClick={() => onFilterChange(filter.value)}
            >
              <span>{filter.label}</span>
              <span>{counts[filter.value]}</span>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Сводка</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center justify-between text-sm">
            <TypographySmall>В работе</TypographySmall>
            <span>{counts.IN_PROGRESS}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <TypographySmall>Просрочено</TypographySmall>
            <span>{overdueCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <TypographySmall>Готово</TypographySmall>
            <span>{counts.DONE}</span>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function TasksPage() {
  const [items, setItems] = React.useState<TaskItem[]>([])
  const [users, setUsers] = React.useState<TaskUser[]>([])
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [activeFilter, setActiveFilter] = React.useState<TaskFilter>("all")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const hadCachedTasksRef = React.useRef(false)

  const loadData = React.useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true)
    }
    setError("")

    try {
      const [meResponse, tasksResponse, usersResponse] = await Promise.all([
        fetch(`${getApiBaseUrl()}/auth/me`, { credentials: "include" }),
        fetch(`${getApiBaseUrl()}/tasks`, { credentials: "include" }),
        fetch(`${getApiBaseUrl()}/tasks/users`, { credentials: "include" }),
      ])

      if (!tasksResponse.ok) {
        setError("Не удалось загрузить задачи")
        return
      }

      let nextCurrentUser: CurrentUser | null = null
      if (meResponse.ok) {
        const payload = (await meResponse.json()) as { user?: CurrentUser }
        nextCurrentUser = payload.user ?? null
        setCurrentUser(nextCurrentUser)
      }

      let nextUsers: TaskUser[] = []
      if (usersResponse.ok) {
        const payload = (await usersResponse.json()) as { items?: TaskUser[] }
        nextUsers = payload.items ?? []
        setUsers(nextUsers)
      }

      const payload = (await tasksResponse.json()) as { items?: TaskItem[] }
      const nextItems = payload.items ?? []
      setItems(nextItems)
      cacheTasks({
        items: nextItems,
        users: nextUsers,
        currentUser: nextCurrentUser,
      })
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const cachedTasks = readCachedTasks()
      hadCachedTasksRef.current = Boolean(cachedTasks.items?.length)

      if (cachedTasks.items) {
        setItems(cachedTasks.items)
        setUsers(cachedTasks.users ?? [])
        setCurrentUser(cachedTasks.currentUser ?? null)
        setIsLoading(false)
      }

      void loadData(!hadCachedTasksRef.current)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  const counts = React.useMemo<Record<TaskFilter, number>>(
    () => ({
      all: items.length,
      mine: currentUser
        ? items.filter((item) => item.creator.id === currentUser.id).length
        : 0,
      assigned: currentUser
        ? items.filter((item) => item.assignee?.id === currentUser.id).length
        : 0,
      TODO: items.filter((item) => item.status === "TODO").length,
      IN_PROGRESS: items.filter((item) => item.status === "IN_PROGRESS").length,
      DONE: items.filter((item) => item.status === "DONE").length,
      CANCELED: items.filter((item) => item.status === "CANCELED").length,
    }),
    [currentUser, items],
  )

  const filteredItems = React.useMemo(() => {
    switch (activeFilter) {
      case "mine":
        return currentUser
          ? items.filter((item) => item.creator.id === currentUser.id)
          : []
      case "assigned":
        return currentUser
          ? items.filter((item) => item.assignee?.id === currentUser.id)
          : []
      case "TODO":
      case "IN_PROGRESS":
      case "DONE":
      case "CANCELED":
        return items.filter((item) => item.status === activeFilter)
      case "all":
      default:
        return items
    }
  }, [activeFilter, currentUser, items])

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError("")

    const form = event.currentTarget
    const formData = new FormData(form)
    const dueAt = String(formData.get("dueAt") ?? "")
    const assigneeId = String(formData.get("assigneeId") ?? "")
    const description = String(formData.get("description") ?? "").trim()

    try {
      const response = await fetch(`${getApiBaseUrl()}/tasks`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          description: description || undefined,
          priority: formData.get("priority"),
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          assigneeId: assigneeId || undefined,
        }),
      })

      if (!response.ok) {
        setError("Не удалось создать задачу")
        return
      }

      const payload = (await response.json()) as { item: TaskItem }
      setItems((currentItems) => {
        const nextItems = [payload.item, ...currentItems]
        cacheTasks({ items: nextItems, users, currentUser })
        return nextItems
      })
      form.reset()
      setIsCreateOpen(false)
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setUpdatingId(taskId)
    setError("")

    try {
      const response = await fetch(`${getApiBaseUrl()}/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        setError("Не удалось обновить задачу")
        return
      }

      const payload = (await response.json()) as { item: TaskItem }
      setItems((currentItems) => {
        const nextItems = currentItems.map((item) =>
          item.id === taskId ? payload.item : item,
        )
        cacheTasks({ items: nextItems, users, currentUser })
        return nextItems
      })
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!window.confirm("Удалить эту задачу?")) {
      return
    }

    setDeletingId(taskId)
    setError("")

    try {
      const response = await fetch(`${getApiBaseUrl()}/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        setError("Не удалось удалить задачу")
        return
      }

      setItems((currentItems) => {
        const nextItems = currentItems.filter((item) => item.id !== taskId)
        cacheTasks({ items: nextItems, users, currentUser })
        return nextItems
      })
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
      <SidebarInset className="h-svh overflow-y-auto">
        <SiteHeader title="Задачи" onOpenFilters={() => setIsFiltersOpen(true)} />
        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetContent
            side="left"
            className="w-[min(420px,calc(100vw-1rem))] overflow-y-auto p-4"
          >
            <SheetHeader className="px-0 pt-0">
              <SheetTitle>Фильтры задач</SheetTitle>
              <SheetDescription>
                Отберите поручения по статусу и ответственности.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4">
              <TasksFiltersPanel
                activeFilter={activeFilter}
                counts={counts}
                overdueCount={items.filter(isOverdue).length}
                onFilterChange={(filter) => {
                  setActiveFilter(filter)
                  setIsFiltersOpen(false)
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="border-b">
              <DialogTitle className={typographyStyles.large}>
                Новая задача
              </DialogTitle>
              <DialogDescription className={typographyStyles.muted}>
                Создайте поручение, назначьте исполнителя и срок.
              </DialogDescription>
            </DialogHeader>
            <form className="grid gap-4 p-4" onSubmit={handleCreateTask}>
              <Input
                name="title"
                placeholder="Название задачи"
                minLength={3}
                maxLength={160}
                required
              />
              <textarea
                name="description"
                placeholder="Описание задачи"
                maxLength={5000}
                className="min-h-28 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Приоритет</span>
                  <select
                    name="priority"
                    defaultValue="MEDIUM"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabels[priority]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Исполнитель</span>
                  <select
                    name="assigneeId"
                    defaultValue={currentUser?.id ?? ""}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserLabel(user)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Срок</span>
                  <input
                    name="dueAt"
                    type="datetime-local"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Создаём..." : "Создать задачу"}
                </Button>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <main className="flex flex-1 flex-col gap-6 p-4 pb-28 md:p-6 xl:px-8">
          <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="flex w-full min-w-0 flex-col gap-4">
              {error ? (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent>
                    <p className="text-sm text-destructive">{error}</p>
                  </CardContent>
                </Card>
              ) : null}
              {isLoading ? (
                <Card>
                  <CardContent>
                    <TypographyMuted>Загружаем задачи...</TypographyMuted>
                  </CardContent>
                </Card>
              ) : null}
              {!isLoading && filteredItems.length === 0 ? (
                <Card>
                  <CardContent className="grid gap-2 text-center">
                    <ClipboardListIcon className="mx-auto size-10 text-muted-foreground" />
                    <CardTitle>Задач пока нет</CardTitle>
                    <TypographyMuted>
                      Создайте первую задачу или смените фильтр.
                    </TypographyMuted>
                  </CardContent>
                </Card>
              ) : null}
              {filteredItems.map((task) => {
                const canDelete =
                  currentUser?.role === "ADMIN" ||
                  currentUser?.role === "SUPER_ADMIN" ||
                  task.creator.id === currentUser?.id

                return (
                  <Card key={task.id}>
                    <CardHeader className="gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className={typographyStyles.h3}>
                            {task.title}
                          </CardTitle>
                          <CardDescription className={typographyStyles.muted}>
                            Создал {getUserLabel(task.creator)}
                          </CardDescription>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge className={getStatusBadgeClass(task.status)}>
                            {statusLabels[task.status]}
                          </Badge>
                          {canDelete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={deletingId === task.id}
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <TrashIcon />
                              <span className="sr-only">Удалить задачу</span>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {task.description ? (
                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={getPriorityBadgeClass(task.priority)}
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground",
                            isOverdue(task) &&
                              "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
                          )}
                        >
                          <CalendarClockIcon className="size-3.5" />
                          {task.dueAt
                            ? dateFormatter.format(new Date(task.dueAt))
                            : "Без срока"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                          <UserIcon className="size-3.5" />
                          {getUserLabel(task.assignee)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t pt-4">
                        {statusOptions.map((status) => (
                          <Button
                            key={status}
                            type="button"
                            variant={task.status === status ? "default" : "outline"}
                            size="sm"
                            disabled={
                              updatingId === task.id || task.status === status
                            }
                            onClick={() => handleStatusChange(task.id, status)}
                          >
                            {status === "DONE" ? (
                              <CheckCircle2Icon />
                            ) : status === "IN_PROGRESS" ? (
                              <Clock3Icon />
                            ) : (
                              <CircleIcon />
                            )}
                            {statusLabels[status]}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </section>
            <aside className="hidden w-full gap-4 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)] xl:grid xl:max-h-[calc(100svh-var(--header-height)-3rem)] xl:self-start xl:overflow-y-auto">
              <Card size="sm" className="bg-primary/5">
                <CardContent className="grid gap-3">
                  <Button
                    type="button"
                    size="lg"
                    className="h-11 justify-start gap-2"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <PlusIcon className="size-4" />
                    Добавить задачу
                  </Button>
                  <TypographyMuted className="text-xs">
                    Создайте поручение и закрепите исполнителя.
                  </TypographyMuted>
                </CardContent>
              </Card>
              <TasksFiltersPanel
                activeFilter={activeFilter}
                counts={counts}
                overdueCount={items.filter(isOverdue).length}
                onFilterChange={setActiveFilter}
              />
            </aside>
          </div>
        </main>
        <MobileBottomNav
          currentUser={currentUser}
          createLabel="Добавить задачу"
          onCreatePost={() => setIsCreateOpen(true)}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

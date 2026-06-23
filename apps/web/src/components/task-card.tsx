"use client"

import * as React from "react"
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleIcon,
  Clock3Icon,
  TrashIcon,
  UserIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { typographyStyles } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import type { TaskItem, TaskStatus, TaskPriority, TaskUser } from "@/types/tasks"

export const statusLabels: Record<TaskStatus, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  DONE: "Готово",
  CANCELED: "Отменено",
}

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  URGENT: "Срочно",
}

export const statusOptions: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELED",
]

export const priorityOptions: TaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function getUserLabel(user?: TaskUser | null) {
  return user ? user.name || user.email : "Не назначен"
}

export function getStatusBadgeClass(status: TaskStatus) {
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

export function getPriorityBadgeClass(priority: TaskPriority) {
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

export function isOverdue(task: TaskItem) {
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

export function TaskCard({
  task,
  currentUser,
  onUpdate,
  onDelete,
}: {
  task: TaskItem
  currentUser: { id: string; role: string } | null
  onUpdate?: (updatedTask: TaskItem) => void
  onDelete?: (id: string) => void
}) {
  const [updating, setUpdating] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState("")

  const canDelete =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "SUPER_ADMIN" ||
    task.creator.id === currentUser?.id

  async function handleStatusChange(status: TaskStatus) {
    setUpdating(true)
    setError("")

    try {
      const response = await fetch(`${getApiBaseUrl()}/tasks/${task.id}`, {
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
      onUpdate?.(payload.item)
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setUpdating(false)
    }
  }

  async function handleDeleteTask() {
    if (!window.confirm("Удалить эту задачу?")) {
      return
    }

    setDeleting(true)
    setError("")

    try {
      const response = await fetch(`${getApiBaseUrl()}/tasks/${task.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        setError("Не удалось удалить задачу")
        return
      }

      onDelete?.(task.id)
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card id={`task-${task.id}`}>
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className={typographyStyles.h3}>{task.title}</CardTitle>
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
                disabled={deleting}
                onClick={handleDeleteTask}
              >
                <TrashIcon />
                <span className="sr-only">Удалить задачу</span>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
            {task.dueAt ? dateFormatter.format(new Date(task.dueAt)) : "Без срока"}
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
              disabled={updating || task.status === status}
              onClick={() => handleStatusChange(status)}
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
}

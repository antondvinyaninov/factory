"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  BellIcon,
  CheckCheckIcon,
  MessageSquareIcon,
  ClipboardListIcon,
  HeartIcon,
  SparklesIcon,
  LifeBuoyIcon,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type NotificationItem = {
  id: string
  userId: string
  title: string
  content: string
  type: string
  read: boolean
  link: string | null
  createdAt: string
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "TASK_ASSIGNED":
    case "TASK_STATUS_CHANGED":
      return <ClipboardListIcon className="size-4 text-blue-500 shrink-0" />
    case "NEWS_COMMENT":
      return <MessageSquareIcon className="size-4 text-emerald-500 shrink-0" />
    case "NEWS_LIKE":
      return <HeartIcon className="size-4 text-rose-500 shrink-0" />
    case "ticket_update":
    case "ticket_comment":
      return <LifeBuoyIcon className="size-4 text-primary shrink-0" />
    default:
      return <SparklesIcon className="size-4 text-amber-500 shrink-0" />
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "только что"
  if (diffMins < 60) return `${diffMins} мин. назад`
  if (diffHours < 24) return `${diffHours} ч. назад`
  if (diffDays === 1) return "вчера"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const router = useRouter()

  const loadNotifications = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.items ?? [])
      }
    } catch (error) {
      console.error("Failed to load notifications", error)
    }
  }, [])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotifications()
    }, 0)

    // Poll every 15 seconds
    const interval = setInterval(() => {
      void loadNotifications()
    }, 15000)

    return () => {
      window.clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [loadNotifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markAsRead(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      })
      if (response.ok) {
        setNotifications((current) =>
          current.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error)
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      })
      if (response.ok) {
        setNotifications((current) => current.map((n) => ({ ...n, read: true })))
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read", error)
    }
  }

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.read) {
      await markAsRead(n.id)
    }
    setIsOpen(false)
    if (n.link) {
      router.push(n.link)
      router.refresh()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative size-9 rounded-lg"
          />
        }
      >
        <BellIcon className="size-[18px]" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white px-1 border border-background shadow-sm"
          >
            {unreadCount}
          </span>
        )}
        <span className="sr-only">Уведомления</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(420px,calc(100vw-1rem))] p-0 gap-0 flex flex-col bg-background border-l shadow-2xl h-full"
      >
        <SheetHeader className="px-6 py-4 pr-14 border-b flex flex-row items-center justify-between bg-muted/20 gap-2">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold leading-none">Уведомления</SheetTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px]">
                +{unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                markAllAsRead()
              }}
              className="h-8 px-2 text-xs font-normal text-muted-foreground hover:text-foreground gap-1.5"
            >
              <CheckCheckIcon className="size-3.5" />
              Прочитать все
            </Button>
          )}
        </SheetHeader>

        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center text-muted-foreground">
              <BellIcon className="size-10 text-muted/40 mb-3" />
              <p className="text-sm font-medium">Нет уведомлений</p>
              <p className="text-xs text-muted/70 mt-1 max-w-[240px]">
                Мы пришлем вам уведомление, когда появится что-то важное
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-b-0",
                  !n.read && "bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15"
                )}
              >
                <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                <div className="grid flex-1 gap-1 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("text-xs font-semibold leading-normal", !n.read ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    {n.content}
                  </p>
                </div>
                {!n.read && (
                  <span className="flex size-2 shrink-0 items-center justify-center rounded-full bg-primary mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import { usePathname } from "next/navigation"
import {
  IconFolder,
  IconListDetails,
  IconMessages,
  IconPlus,
  type Icon,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MobileNavItem = {
  title: string
  url: string
  icon: Icon
}

const items: MobileNavItem[] = [
  {
    title: "Лента",
    url: "/news",
    icon: IconListDetails,
  },
  {
    title: "Задачи",
    url: "/tasks",
    icon: IconFolder,
  },
  {
    title: "Сообщения",
    url: "#",
    icon: IconMessages,
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

export function MobileBottomNav({
  currentUser,
  onCreatePost,
  createLabel = "Добавить пост",
}: {
  currentUser?: {
    name: string
    email: string
  } | null
  onCreatePost?: () => void
  createLabel?: string
}) {
  const pathname = usePathname()
  const [feedItem, tasksItem, messagesItem] = items

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {[feedItem, tasksItem].map((item) => {
          const Icon = item.icon
          const isActive =
            item.url === pathname ||
            (item.url === "/dashboard" && pathname === "/")

          return (
            <a
              key={item.title}
              href={item.url}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 items-center justify-center rounded-xl px-1 py-2 text-muted-foreground transition-colors",
                isActive && "bg-primary text-primary-foreground",
              )}
            >
              <Icon className="size-6 shrink-0" />
              <span className="sr-only">{item.title}</span>
            </a>
          )
        })}
        <Button
          type="button"
          size="icon-lg"
          className="mx-auto size-12 rounded-2xl shadow-sm"
          onClick={onCreatePost}
        >
          <IconPlus className="size-6" />
          <span className="sr-only">{createLabel}</span>
        </Button>
        {(() => {
          const Icon = messagesItem.icon
          const isActive = messagesItem.url === pathname

          return (
            <a
              href={messagesItem.url}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 items-center justify-center rounded-xl px-1 py-2 text-muted-foreground transition-colors",
                isActive && "bg-primary text-primary-foreground",
              )}
            >
              <Icon className="size-6 shrink-0" />
              <span className="sr-only">{messagesItem.title}</span>
            </a>
          )
        })()}
        <a
          href="#"
          className="flex min-w-0 items-center justify-center rounded-xl px-1 py-2 text-muted-foreground transition-colors"
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {getInitials(currentUser?.name ?? "", currentUser?.email ?? "")}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Профиль</span>
        </a>
      </div>
    </nav>
  )
}

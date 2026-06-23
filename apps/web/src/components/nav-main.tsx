"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type MainMenuItem = {
  title: string
  url: string
  icon?: React.ReactNode
  isActive?: boolean
}

export function NavMain({
  items,
}: {
  items: MainMenuItem[]
}) {
  const pathname = usePathname()
  const [hasUnreadMessages, setHasUnreadMessages] = React.useState(false)

  const checkUnreads = React.useCallback(async () => {
    try {
      // Check unread messages
      const msgsRes = await fetch("/api/messages/conversations")
      if (msgsRes.ok) {
        const data = await msgsRes.json()
        setHasUnreadMessages(
          data.items?.some((c: { unreadCount: number }) => c.unreadCount > 0) ?? false
        )
      }
    } catch {
      // Ignore API check errors (e.g. during logout)
    }
  }, [])

  React.useEffect(() => {
    const handleMessagesRead = () => {
      void checkUnreads()
    }

    window.addEventListener("messages-read", handleMessagesRead)

    const timeoutId = window.setTimeout(() => {
      void checkUnreads()
    }, 0)

    // Poll every 15 seconds
    const interval = setInterval(() => {
      void checkUnreads()
    }, 15000)

    return () => {
      window.removeEventListener("messages-read", handleMessagesRead)
      window.clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [checkUnreads])

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url === pathname || (item.url === "/dashboard" && pathname === "/")

            // Determine if this item should show a red dot indicator
            const showIndicator = item.title === "Сообщения" && hasUnreadMessages

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  isActive={isActive || item.isActive}
                  tooltip={item.title}
                  className={
                    isActive || item.isActive
                      ? "bg-primary! text-primary-foreground! hover:bg-primary/90! hover:text-primary-foreground! active:bg-primary/90! active:text-primary-foreground!"
                      : undefined
                  }
                >
                  {item.icon}
                  <span className="flex-1">{item.title}</span>
                  {showIndicator && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

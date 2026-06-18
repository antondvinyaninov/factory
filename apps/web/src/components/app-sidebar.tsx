"use client"

import * as React from "react"
import Link from "next/link"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  IconDashboard,
  IconDatabase,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconMessages,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import { getCurrentUserCached } from "@/lib/auth-client"

const data = {
  navMain: [
    {
      title: "Обзор",
      url: "/dashboard",
      icon: <IconDashboard />,
    },
    {
      title: "Лента",
      url: "/news",
      icon: <IconListDetails />,
    },
    {
      title: "Сообщения",
      url: "/messages",
      icon: <IconMessages />,
    },
    {
      title: "Задачи",
      url: "/tasks",
      icon: <IconFolder />,
    },
    {
      title: "Сотрудники",
      url: "#",
      icon: <IconUsers />,
    },
  ],
  navSecondary: [
    {
      title: "Настройки",
      url: "#",
      icon: <IconSettings />,
    },
    {
      title: "Помощь",
      url: "#",
      icon: <IconHelp />,
    },
    {
      title: "Поиск",
      url: "#",
      icon: <IconSearch />,
    },
  ],
  documents: [
    {
      name: "База знаний",
      url: "#",
      icon: <IconDatabase />,
    },
    {
      name: "Отчёты",
      url: "#",
      icon: <IconReport />,
    },
    {
      name: "Документооборот",
      url: "#",
      icon: <IconFileWord />,
    },
  ],
}

type SidebarUser = {
  name: string
  email: string
  avatar: string
}

const fallbackUser: SidebarUser = {
  name: "Пользователь",
  email: "Загрузка...",
  avatar: "",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<SidebarUser>(fallbackUser)

  React.useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      try {
        const user = await getCurrentUserCached()

        if (!isMounted || !user?.email) {
          return
        }

        setUser({
          name: user.name ?? user.email,
          email: user.email,
          avatar: "",
        })
      } catch {
        // Keep fallback user in the sidebar.
      }
    }

    void loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/news" />}
            >
              <img
                src="/logo-portal.svg"
                alt="Логотип портала"
                className="size-6 shrink-0"
              />
              <span className="text-base font-semibold">Factory 1.0</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

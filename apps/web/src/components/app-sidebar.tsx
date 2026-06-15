"use client"

import * as React from "react"

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

const data = {
  navMain: [
    {
      title: "Обзор",
      url: "#",
      icon: <IconDashboard />,
      isActive: true,
    },
    {
      title: "Новости",
      url: "#",
      icon: <IconListDetails />,
    },
    {
      title: "Сообщения",
      url: "#",
      icon: <IconMessages />,
    },
    {
      title: "Задачи",
      url: "#",
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
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/me`,
          {
            credentials: "include",
          },
        )

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as {
          user?: {
            name?: string
            email?: string
          }
        }

        if (!isMounted || !payload.user?.email) {
          return
        }

        setUser({
          name: payload.user.name ?? payload.user.email,
          email: payload.user.email,
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
              render={<a href="#" />}
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

"use client"

import * as React from "react"
import Link from "next/link"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { OnboardingModal } from "@/components/onboarding-modal"
import {
  Sidebar,
  SidebarContent,
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
  IconClock,
  IconSettings,
  IconUser,
  IconUsers,
  IconBrain,
  IconSparkles,
  IconLifebuoy,
} from "@tabler/icons-react"
import { getCurrentUserCached } from "@/lib/auth-client"

const data = {
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
  ],
  documents: [
    {
      name: "База знаний",
      url: "#",
      icon: <IconDatabase />,
    },
    {
      name: "Служба поддержки",
      url: "/helpdesk",
      icon: <IconLifebuoy />,
    },
    {
      name: "Документооборот",
      url: "/documents",
      icon: <IconFileWord />,
    },
  ],
}

type SidebarUser = {
  id: string
  name: string
  email: string
  avatar: string
}

const fallbackUser: SidebarUser = {
  id: "",
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
          id: user.id,
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

  const navMainItems = React.useMemo(() => [
    {
      title: "Обзор",
      url: "/dashboard",
      icon: <IconDashboard />,
    },
    {
      title: "Профиль",
      url: user.id ? `/profile/${user.id}` : "#",
      icon: <IconUser />,
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
      url: "/employees",
      icon: <IconUsers />,
    },
    {
      title: "Учет времени",
      url: "/time-tracking",
      icon: <IconClock />,
    },
    {
      title: "AI Ассистент",
      url: "/ai-assistant",
      icon: <IconBrain />,
    },
  ], [user.id])

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
        <NavMain items={navMainItems} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
        <SidebarMenu className="px-2 pb-4">
          <SidebarMenuItem>
            <OnboardingModal trigger={
              <SidebarMenuButton>
                <IconSparkles className="size-4" />
                <span>Инструктаж</span>
              </SidebarMenuButton>
            } />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { WorkShiftToggle } from "@/components/work-shift-toggle"
import { TypographyH1 } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import {
  SlidersHorizontalIcon,
  LogOutIcon,
  CircleUserRoundIcon,
  SearchIcon,
  HomeIcon,
  InboxIcon,
  FileTextIcon,
  FolderIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCurrentUserCached, clearCurrentUserCache } from "@/lib/auth-client"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

type HeaderUser = {
  id: string
  name: string
  email: string
  avatar: string
}

interface SearchUser {
  id: string
  name?: string | null
  email: string
}

interface SearchConversationParticipant {
  id: string
  user: SearchUser
}

interface SearchConversationMessage {
  id: string
  content: string
  createdAt: string
  author: SearchUser
}

interface SearchConversation {
  id: string
  title: string | null
  isGroup: boolean
  participants: SearchConversationParticipant[]
  lastMessage: SearchConversationMessage | null
  matchedMessage?: SearchConversationMessage | null
}

interface SearchTask {
  id: string
  title: string
  description?: string | null
  status: string
}

interface SearchPost {
  id: string
  title: string
  content?: string | null
}

const fallbackUser: HeaderUser = {
  id: "",
  name: "Пользователь",
  email: "Загрузка...",
  avatar: "",
}

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

function getConversationTitle(conversation: SearchConversation, currentUser: HeaderUser | null) {
  if (conversation.title) {
    return conversation.title
  }

  const otherParticipants = conversation.participants
    ?.map((p) => p.user)
    .filter((u) => u.id !== currentUser?.id) ?? []

  if (otherParticipants.length === 0) {
    return "Заметки"
  }

  return otherParticipants.map((u) => u.name || u.email).join(", ")
}

export function SiteHeader({
  title = "Панель управления порталом",
  onOpenFilters,
}: {
  title?: string
  onOpenFilters?: () => void
}) {
  const [user, setUser] = React.useState<HeaderUser>(fallbackUser)
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Search data states
  const [tasks, setTasks] = React.useState<SearchTask[]>([])
  const [posts, setPosts] = React.useState<SearchPost[]>([])
  const [chats, setChats] = React.useState<SearchConversation[]>([])
  
  const router = useRouter()

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
        // Keep fallback user
      }
    }

    void loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch tasks, news posts, and chat conversations
  const loadSearchItems = React.useCallback(async () => {
    try {
      const [tasksRes, postsRes, chatsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/news"),
        fetch("/api/messages/conversations")
      ])
      
      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setTasks(data.items ?? [])
      }
      if (postsRes.ok) {
        const data = await postsRes.json()
        setPosts(data.items ?? [])
      }
      if (chatsRes.ok) {
        const data = await chatsRes.json()
        setChats(data.items ?? [])
      }
    } catch (error) {
      console.error("Failed to load search items", error)
    }
  }, [])

  // Load search data whenever dialog opens or searchQuery changes
  React.useEffect(() => {
    if (!open) return

    const controller = new AbortController()

    async function performSearch() {
      try {
        const queryParam = searchQuery.trim()
        if (!queryParam) {
          void loadSearchItems()
          return
        }

        const url = `/api/search?q=${encodeURIComponent(queryParam)}`
        const res = await fetch(url, {
          signal: controller.signal,
          credentials: "include"
        })
        if (res.ok) {
          const data = await res.json()
          setTasks(data.tasks ?? [])
          setPosts(data.posts ?? [])
          setChats(data.chats ?? [])
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Search failed", error)
        }
      }
    }

    const timer = setTimeout(() => {
      void performSearch()
    }, 200)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [open, searchQuery, loadSearchItems])

  // Listen for Meta+K or Ctrl+K to toggle the command menu
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  async function handleLogout() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } finally {
      clearCurrentUserCache()
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear supports-backdrop-filter:bg-background/80 md:peer-data-[variant=inset]:rounded-t-xl group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <Image
          src="/logo-portal.svg"
          alt="Логотип портала"
          width={28}
          height={28}
          className="size-7 shrink-0 md:hidden"
        />
        <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <TypographyH1 className="text-base font-medium tracking-normal lg:text-base">
          {title}
        </TypographyH1>

        <div className="ml-auto flex items-center gap-2">
          {onOpenFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="xl:hidden"
              onClick={onOpenFilters}
            >
              <SlidersHorizontalIcon />
              <span className="sr-only">Открыть фильтры</span>
            </Button>
          ) : null}

          {/* Search Trigger */}
          <div className="hidden md:flex w-full max-w-[180px] lg:max-w-[240px]">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full text-left cursor-pointer focus:outline-none"
            >
              <InputGroup>
                <InputGroupInput placeholder="Поиск..." readOnly className="cursor-pointer" />
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </InputGroupAddon>
              </InputGroup>
            </button>
          </div>

          <WorkShiftToggle />
          <NotificationsDropdown />
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full p-0 flex items-center justify-center focus-visible:ring-0"
                />
              }
            >
              <Avatar className="h-8 w-8 rounded-full grayscale hover:opacity-80 transition-opacity">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full text-xs font-semibold">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={4}>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-full">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-full text-xs font-semibold">
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => user.id && router.push(`/profile/${user.id}`)}>
                  <CircleUserRoundIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Профиль</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CircleUserRoundIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Доступы</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Command Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Поиск по всему порталу..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>Ничего не найдено.</CommandEmpty>
          
          <CommandGroup heading="Навигация">
            <CommandItem onSelect={() => { setOpen(false); router.push("/dashboard") }}>
              <HomeIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Обзор</span>
              <CommandShortcut>⌘H</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); if (user.id) router.push(`/profile/${user.id}`) }}>
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Профиль</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); router.push("/news") }}>
              <FileTextIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Лента новостей</span>
              <CommandShortcut>⌘L</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); router.push("/messages") }}>
              <InboxIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Сообщения</span>
              <CommandShortcut>⌘M</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); router.push("/tasks") }}>
              <FolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Задачи</span>
              <CommandShortcut>⌘T</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {/* Dynamic Chats */}
          {chats.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Чаты и диалоги">
                {chats.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`чат диалог ${getConversationTitle(c, user)} ${c.lastMessage?.content ?? ""} ${c.matchedMessage?.content ?? ""}`}
                    onSelect={() => {
                      setOpen(false)
                      router.push(`/messages?id=${c.id}`)
                    }}
                  >
                    <InboxIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{getConversationTitle(c, user)}</span>
                    {c.matchedMessage ? (
                      <span className="ml-2 text-xs text-primary font-medium truncate max-w-[150px] lg:max-w-[200px]">
                        — {c.matchedMessage.content}
                      </span>
                    ) : c.lastMessage ? (
                      <span className="ml-2 text-xs text-muted-foreground truncate max-w-[150px] lg:max-w-[200px]">
                        — {c.lastMessage.content}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Dynamic Tasks */}
          {tasks.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Задачи">
                {tasks.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`задача task ${t.title} ${t.description ?? ""} ${t.status}`}
                    onSelect={() => {
                      setOpen(false)
                      router.push(`/tasks?id=${t.id}`)
                    }}
                  >
                    <FolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider font-semibold font-mono">{t.status}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Dynamic News */}
          {posts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Публикации и Лента">
                {posts.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`пост новость лента post news ${p.title} ${p.content ?? ""}`}
                    onSelect={() => {
                      setOpen(false)
                      router.push(`/news?id=${p.id}`)
                    }}
                  >
                    <FileTextIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{p.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Быстрые действия">
            <CommandItem onSelect={() => { setOpen(false); router.push("/tasks?action=new") }}>
              <PlusIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Создать задачу</span>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); router.push("/news?action=new") }}>
              <PlusIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Создать публикацию</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  )
}

"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  CalendarIcon,
  IdCardIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
  SparklesIcon,
  UserIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  TypeIcon,
  ClipboardListIcon,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  typographyStyles,
  TypographyMuted,
  TypographyProse,
  TypographySmall,
} from "@/components/ui/typography"
import { getCurrentUserCached } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { ProfileEditDialog } from "@/components/profile-edit-dialog"

import type { NewsPost } from "@/types/news"
import { NewsPostCard } from "@/components/news-post-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { TaskItem } from "@/types/tasks"
import { TaskCard } from "@/components/task-card"

type CurrentUser = {
  id: string
  name: string
  email: string
  role: "SUPER_ADMIN" | "ADMIN" | "USER"
}

type UserProfile = {
  id: string
  email: string
  name: string
  personnelNumber: string | null
  lastName: string | null
  firstName: string | null
  middleName: string | null
  birthDate: string | null
  hireDate: string | null
  terminationDate: string | null
  department: string | null
  unitBureau: string | null
  position: string | null
  managerName: string | null
  phones: string[]
  photoUrl: string | null
  isActive: boolean
  workStatus?: string
  location?: string
  bio?: string
  skills?: string[]
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api"
}

function getFullName(employee: UserProfile) {
  const parts = [
    employee.lastName,
    employee.firstName,
    employee.middleName,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" ") : employee.name
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

function formatDate(value: string | null) {
  if (!value) return "—"
  return dateFormatter.format(new Date(value))
}

function getDepartmentLabel(employee: UserProfile) {
  const department = employee.department?.trim()
  if (!department) return "—"
  const codeMatch = department.match(/^0*(\d+)/)
  return codeMatch?.[1] ?? department
}

function getWorkDuration(employee: UserProfile) {
  if (!employee.hireDate) return "—"

  const start = new Date(employee.hireDate).getTime()
  const end = employee.terminationDate
    ? new Date(employee.terminationDate).getTime()
    : Date.now()
  const months = Math.max(
    0,
    Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30.44)),
  )

  if (months < 12) return `${months || 1} мес.`

  const years = Math.floor(months / 12)
  const restMonths = months % 12

  return restMonths > 0 ? `${years} г. ${restMonths} мес.` : `${years} г.`
}

const getStatusLabel = (status: string | undefined) => {
  switch (status) {
    case "IN_OFFICE": return "В офисе";
    case "REMOTE": return "Удаленно";
    case "VACATION": return "В отпуске";
    case "SICK_LEAVE": return "На больничном";
    case "BUSINESS_TRIP": return "В командировке";
    default: return status || "В офисе";
  }
};

function ProfileMetric({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4">
      <TypographySmall className="text-muted-foreground">{label}</TypographySmall>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}

export default function ProfilePage() {
  const params = useParams<{ id: string }>()
  const profileId = params.id
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [posts, setPosts] = React.useState<NewsPost[]>([])
  const [tasks, setTasks] = React.useState<TaskItem[]>([])
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const [nextCurrentUser, profileResponse, newsResponse, tasksResponse] =
        await Promise.all([
          getCurrentUserCached(),
          fetch(`${getApiBaseUrl()}/users/${profileId}`),
          fetch(`${getApiBaseUrl()}/news`, { credentials: "include" }),
          fetch(`${getApiBaseUrl()}/tasks`, { credentials: "include" }),
        ])

      setCurrentUser(nextCurrentUser)

      if (!profileResponse.ok) {
        setError("Не удалось загрузить профиль")
        return
      }

      const nextProfile = await profileResponse.json()
      setProfile(nextProfile)

      if (newsResponse.ok) {
        const newsPayload = (await newsResponse.json()) as { items?: NewsPost[] }
        setPosts((newsPayload.items ?? []).filter((post) => post.author.id === profileId))
      }

      if (tasksResponse.ok) {
        const tasksPayload = (await tasksResponse.json()) as { items?: TaskItem[] }
        setTasks((tasksPayload.items ?? []).filter(task => task.assignee?.id === profileId || task.creator.id === profileId))
      }
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsLoading(false)
    }
  }, [profileId])

  React.useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const fullName = profile ? getFullName(profile) : "Профиль"
  const isOwner = currentUser && profile && currentUser.id === profile.id


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
        <SiteHeader title="Профиль" />
        <main className="flex flex-1 flex-col gap-6 p-4 pb-28 md:p-6 xl:px-8">
          {error ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : null}

          {isLoading && !profile ? (
            <Card>
              <CardContent className="p-6">
                <TypographyMuted>Загружаем профиль...</TypographyMuted>
              </CardContent>
            </Card>
          ) : null}

          {profile ? (
            <>
              <Card>
                <CardContent className="grid gap-5 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:p-6">
                  <div className="w-full justify-self-stretch md:w-auto md:justify-self-start">
                    <div className="aspect-square w-full overflow-hidden rounded-3xl border-4 border-background bg-muted shadow-sm md:size-72 relative group">
                      {profile.photoUrl ? (
                        <Image
                          src={profile.photoUrl}
                          alt={fullName}
                          width={320}
                          height={320}
                          unoptimized
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center">
                          <Avatar className="size-40 md:size-44">
                            <AvatarFallback className="text-2xl">
                              {getInitials(fullName, profile.email)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className={typographyStyles.h1}>
                            {fullName}
                          </CardTitle>
                          <Badge
                            variant={
                              profile.terminationDate
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {profile.terminationDate ? "Уволен" : getStatusLabel(profile.workStatus)}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2 text-base">
                          {profile.position ?? "Сотрудник"} · отдел{" "}
                          {getDepartmentLabel(profile)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isOwner ? (
                          <ProfileEditDialog user={profile} onUpdate={loadProfile} />
                        ) : (
                          <>
                            <Link
                              href="/messages"
                              className={cn(
                                buttonVariants({ variant: "default" }),
                                "gap-2",
                              )}
                            >
                              <MessageCircleIcon className="size-4" />
                              Написать
                            </Link>
                            <Link
                              href="/tasks"
                              className={cn(
                                buttonVariants({ variant: "outline" }),
                                "gap-2",
                              )}
                            >
                              <SendIcon className="size-4" />
                              Поставить задачу
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <ProfileMetric
                        label="Табельный №"
                        value={profile.personnelNumber ?? "—"}
                      />
                      <ProfileMetric
                        label="На заводе"
                        value={getWorkDuration(profile)}
                      />

                      <ProfileMetric
                        label="Телефон"
                        value={profile.phones[0] ?? "—"}
                      />
                      <ProfileMetric
                        label="Кабинет"
                        value={profile.location ?? "—"}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <section className="grid gap-6">
                  {profile.bio && (
                    <Card>
                      <CardHeader>
                        <CardTitle>О себе</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TypographyProse className="whitespace-pre-wrap text-sm">
                          {profile.bio}
                        </TypographyProse>
                      </CardContent>
                    </Card>
                  )}
                  {profile.skills && profile.skills.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Ключевые навыки</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary" className="px-3 py-1 text-sm font-normal">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}


                  <Tabs defaultValue="posts" className="w-full">
                    <TabsList className="bg-transparent gap-2 h-auto p-0 flex-wrap mb-6">
                      <TabsTrigger value="posts" className="rounded-full px-6 py-2 text-base data-[state=active]:bg-muted data-[state=active]:shadow-none border bg-transparent">
                        Публикации
                      </TabsTrigger>
                      <TabsTrigger value="tasks" className="rounded-full px-6 py-2 text-base data-[state=active]:bg-muted data-[state=active]:shadow-none border bg-transparent">
                        Задачи
                      </TabsTrigger>
                      <TabsTrigger value="processes" className="rounded-full px-6 py-2 text-base data-[state=active]:bg-muted data-[state=active]:shadow-none border bg-transparent">
                        Процессы
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="posts" className="mt-0">
                      {posts.length === 0 ? (
                        <Card>
                          <CardContent className="p-6 text-center">
                            <TypographyMuted>
                              Пока нет публикаций.
                            </TypographyMuted>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {posts.map((post) => (
                            <NewsPostCard
                              key={post.id}
                              initialItem={post}
                              currentUser={currentUser}
                              onDelete={(id) => setPosts(current => current.filter(p => p.id !== id))}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="tasks" className="mt-0">
                      {tasks.length > 0 ? (
                        <div className="flex flex-col gap-4">
                          <div className="grid gap-4">
                            {tasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                currentUser={currentUser}
                                onDelete={(id) => setTasks(current => current.filter(t => t.id !== id))}
                                onUpdate={(updated) => setTasks(current => current.map(t => t.id === updated.id ? updated : t))}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="p-6 text-center">
                            <TypographyMuted>Нет задач</TypographyMuted>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="processes" className="mt-0">
                      <Card>
                        <CardContent className="p-6 text-center">
                          <TypographyMuted>Процессы пока недоступны.</TypographyMuted>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </section>
                <aside className="grid content-start gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserIcon className="size-4 text-muted-foreground" />
                        Заводской профиль
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                      <div className="flex items-start gap-3">
                        <BriefcaseBusinessIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Должность</TypographySmall>
                          <div>{profile.position ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Building2Icon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Подразделение</TypographySmall>
                          <div>Отдел {getDepartmentLabel(profile)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Building2Icon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Бюро</TypographySmall>
                          <div>{profile.unitBureau ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <UserIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Руководитель</TypographySmall>
                          <div>{profile.managerName ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <IdCardIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Табельный номер</TypographySmall>
                          <div>{profile.personnelNumber ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Дата приема</TypographySmall>
                          <div>{formatDate(profile.hireDate)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <PhoneIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Телефон</TypographySmall>
                          <div>{profile.phones[0] ?? "—"}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </>
          ) : null}
        </main>
        <MobileBottomNav currentUser={currentUser} createLabel="Пост" />
      </SidebarInset>
    </SidebarProvider>
  )
}

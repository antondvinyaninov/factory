"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeftIcon,
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

type CurrentUser = {
  id: string
  name: string
  email: string
  role: "SUPER_ADMIN" | "ADMIN" | "USER"
}

type EmployeeProfile = {
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
}

import type { NewsPost } from "@/types/news"
import { NewsPostCard } from "@/components/news-post-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { TaskItem } from "@/types/tasks"
import { TaskCard } from "@/components/task-card"

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})


function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api"
}

function getFullName(employee: EmployeeProfile) {
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
  if (!value) {
    return "—"
  }

  return dateFormatter.format(new Date(value))
}

function getDepartmentLabel(employee: EmployeeProfile) {
  const department = employee.department?.trim()

  if (!department) {
    return "—"
  }

  const codeMatch = department.match(/^0*(\d+)/)
  return codeMatch?.[1] ?? department
}

function getWorkDuration(employee: EmployeeProfile) {
  if (!employee.hireDate) {
    return "—"
  }

  const start = new Date(employee.hireDate).getTime()
  const end = employee.terminationDate
    ? new Date(employee.terminationDate).getTime()
    : Date.now()
  const months = Math.max(
    0,
    Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30.44)),
  )

  if (months < 12) {
    return `${months || 1} мес.`
  }

  const years = Math.floor(months / 12)
  const restMonths = months % 12

  return restMonths > 0 ? `${years} г. ${restMonths} мес.` : `${years} г.`
}

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

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>()
  const employeeId = params.id
  const [employee, setEmployee] = React.useState<EmployeeProfile | null>(null)
  const [posts, setPosts] = React.useState<NewsPost[]>([])
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setError("")

      try {
        const [nextCurrentUser, employeeResponse, newsResponse] =
          await Promise.all([
            getCurrentUserCached(),
            fetch(`${getApiBaseUrl()}/employees/${employeeId}`, {
              credentials: "include",
            }),
            fetch(`${getApiBaseUrl()}/news`, { credentials: "include" }),
          ])

        setCurrentUser(nextCurrentUser)

        if (!employeeResponse.ok) {
          setError("Не удалось загрузить профиль сотрудника")
          return
        }

        const employeePayload = (await employeeResponse.json()) as {
          item?: EmployeeProfile
        }
        const nextEmployee = employeePayload.item ?? null
        setEmployee(nextEmployee)

        if (newsResponse.ok) {
          const newsPayload = (await newsResponse.json()) as {
            items?: NewsPost[]
          }
          setPosts(
            (newsPayload.items ?? []).filter(
              (post) => post.author.id === employeeId,
            ),
          )
        }
        

      } catch {
        setError("Не удалось подключиться к API")
      } finally {
        setIsLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [employeeId])

  const fullName = employee ? getFullName(employee) : "Профиль сотрудника"


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
        <SiteHeader title="Профиль сотрудника" />
        <main className="flex flex-1 flex-col gap-6 p-4 pb-28 md:p-6 xl:px-8">
          <div>
            <Link
              href="/employees"
              className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}
            >
              <ArrowLeftIcon className="size-4" />
              К списку сотрудников
            </Link>
          </div>

          {error ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : null}

          {isLoading && !employee ? (
            <Card>
              <CardContent className="p-6">
                <TypographyMuted>Загружаем профиль...</TypographyMuted>
              </CardContent>
            </Card>
          ) : null}

          {employee ? (
            <>
              <Card>
                <CardContent className="grid gap-5 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:p-6">
                  <div className="w-full justify-self-stretch md:w-auto md:justify-self-start">
                    <div className="aspect-square w-full overflow-hidden rounded-3xl border-4 border-background bg-muted shadow-sm md:size-72">
                      {employee.photoUrl ? (
                        <Image
                          src={employee.photoUrl}
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
                              {getInitials(fullName, employee.email)}
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
                              employee.terminationDate
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {employee.terminationDate ? "Уволен" : "Работает"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2 text-base">
                          {employee.position ?? "Должность не указана"} · отдел{" "}
                          {getDepartmentLabel(employee)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <ProfileMetric
                        label="Табельный №"
                        value={employee.personnelNumber ?? "—"}
                      />
                      <ProfileMetric
                        label="На заводе"
                        value={getWorkDuration(employee)}
                      />

                      <ProfileMetric
                        label="Телефон"
                        value={employee.phones[0] ?? "—"}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <section className="flex flex-col gap-6">

                  {posts.length === 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <SparklesIcon className="size-4 text-muted-foreground" />
                          Публикации сотрудника
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TypographyMuted>
                          Пока нет публикаций в ленте.
                        </TypographyMuted>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight mb-2">
                        <SparklesIcon className="size-5 text-muted-foreground" />
                        Публикации сотрудника
                      </h2>
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
                          <div>{employee.position ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Building2Icon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Подразделение</TypographySmall>
                          <div>Отдел {getDepartmentLabel(employee)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Building2Icon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Бюро</TypographySmall>
                          <div>{employee.unitBureau ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <UserIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Руководитель</TypographySmall>
                          <div>{employee.managerName ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <IdCardIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Табельный номер</TypographySmall>
                          <div>{employee.personnelNumber ?? "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Дата приема</TypographySmall>
                          <div>{formatDate(employee.hireDate)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <PhoneIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <TypographySmall>Телефон</TypographySmall>
                          <div>{employee.phones[0] ?? "—"}</div>
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

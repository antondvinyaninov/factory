"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, UsersIcon } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TypographyMuted,
} from "@/components/ui/typography"
import { getCurrentUserCached } from "@/lib/auth-client"

type CurrentUser = {
  id: string
  name: string
  email: string
  role: "SUPER_ADMIN" | "ADMIN" | "USER"
}

type EmployeeItem = {
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

const EMPLOYEES_CACHE_KEY = "factory-employees-cache"

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api"
}

function getFullName(employee: EmployeeItem) {
  const parts = [
    employee.lastName,
    employee.firstName,
    employee.middleName,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" ") : employee.name
}

function getFirstLastName(employee: EmployeeItem) {
  const parts = [employee.firstName, employee.lastName].filter(Boolean)

  return parts.length > 0 ? parts.join(" ") : getFullName(employee)
}

function getInitials(employee: EmployeeItem) {
  const source = getFullName(employee) || employee.email

  return source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function getDepartmentLabel(employee: EmployeeItem) {
  const department = employee.department?.trim()

  if (!department) {
    return "—"
  }

  const codeMatch = department.match(/^0*(\d+)/)
  return codeMatch?.[1] ?? department
}

function readCachedEmployees() {
  if (typeof window === "undefined") {
    return [] as EmployeeItem[]
  }

  try {
    const cachedValue = window.sessionStorage.getItem(EMPLOYEES_CACHE_KEY)
    return cachedValue
      ? ((JSON.parse(cachedValue) as { items?: EmployeeItem[] }).items ?? [])
      : []
  } catch {
    return []
  }
}

function cacheEmployees(items: EmployeeItem[]) {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(EMPLOYEES_CACHE_KEY, JSON.stringify({ items }))
}

export default function EmployeesPage() {
  const router = useRouter()
  const [items, setItems] = React.useState<EmployeeItem[]>([])
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const hadCachedEmployeesRef = React.useRef(false)

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return items
    }

    return items.filter((item) =>
      [
        getFullName(item),
        item.personnelNumber,
        item.department,
        item.position,
        item.email,
        item.phones.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [items, searchQuery])

  const loadEmployees = React.useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true)
    }
    setError("")

    try {
      const [nextCurrentUser, employeesResponse] = await Promise.all([
        getCurrentUserCached(),
        fetch(`${getApiBaseUrl()}/employees`, { credentials: "include" }),
      ])

      setCurrentUser(nextCurrentUser)

      if (!employeesResponse.ok) {
        setError("Не удалось загрузить сотрудников")
        return
      }

      const payload = (await employeesResponse.json()) as {
        items?: EmployeeItem[]
      }
      const nextItems = payload.items ?? []

      setItems(nextItems)
      cacheEmployees(nextItems)
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const cachedItems = readCachedEmployees()
      hadCachedEmployeesRef.current = cachedItems.length > 0

      if (cachedItems.length > 0) {
        setItems(cachedItems)
        setIsLoading(false)
      }

      void loadEmployees(!hadCachedEmployeesRef.current)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadEmployees])

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
        <SiteHeader title="Сотрудники" />
        <main className="flex flex-1 flex-col gap-6 p-4 pb-28 md:p-6 xl:px-8">
          <div className="grid w-full gap-6">
            <aside className="grid gap-4">
              <Card size="sm" className="bg-primary/5">
                <CardContent className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="size-5 text-primary" />
                    <div>
                      <CardTitle>Картотека сотрудников</CardTitle>
                      <CardDescription>
                        Поля перенесены из кадровой карточки.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Поиск по ФИО, табельному, отделу"
                      className="pl-9"
                    />
                  </div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Список</CardTitle>
                  <CardDescription>
                    Найдено: {filteredItems.length}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted">
                        <TableRow>
                          <TableHead className="w-28">Таб. №</TableHead>
                          <TableHead className="w-16">Фото</TableHead>
                          <TableHead>Имя и фамилия</TableHead>
                          <TableHead>Телефон</TableHead>
                          <TableHead>Подразделение</TableHead>
                          <TableHead>Должность</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <TypographyMuted>
                                Загружаем сотрудников...
                              </TypographyMuted>
                            </TableCell>
                          </TableRow>
                        ) : null}
                        {error ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <p className="text-sm text-destructive">
                                {error}
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : null}
                        {!isLoading && filteredItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <TypographyMuted>
                                Сотрудники не найдены.
                              </TypographyMuted>
                            </TableCell>
                          </TableRow>
                        ) : null}
                        {filteredItems.map((employee) => {
                          const profileUrl = `/employees/${employee.id}`

                          return (
                            <TableRow
                              key={employee.id}
                              role="button"
                              tabIndex={0}
                              className="cursor-pointer"
                              onClick={() => router.push(profileUrl)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault()
                                  router.push(profileUrl)
                                }
                              }}
                            >
                              <TableCell className="font-medium">
                                {employee.personnelNumber ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Avatar className="size-9">
                                  <AvatarImage
                                    src={employee.photoUrl ?? undefined}
                                    alt={getFullName(employee)}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(employee)}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-72 truncate font-medium">
                                  {getFirstLastName(employee)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {employee.phones[0] ?? "—"}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-28 truncate">
                                  {getDepartmentLabel(employee)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-56 truncate">
                                  {employee.position ?? "—"}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
        <MobileBottomNav currentUser={currentUser} createLabel="Сотрудник" />
      </SidebarInset>
    </SidebarProvider>
  )
}

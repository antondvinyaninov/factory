export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED"
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER"
export type TaskFilter = "all" | "mine" | "assigned" | TaskStatus

export type TaskUser = {
  id: string
  name: string
  email: string
}

export type CurrentUser = TaskUser & {
  role: UserRole
}

export type TaskItem = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueAt: string | null
  createdAt: string
  updatedAt: string
  creator: TaskUser
  assignee: TaskUser | null
}

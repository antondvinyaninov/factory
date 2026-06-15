"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          }),
        },
      )

      if (!response.ok) {
        setError("Неверный логин или пароль")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Не удалось подключиться к API")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription>
            Используйте корпоративную учётную запись
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Логин или email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="ivanov@factory.local"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Забыли пароль?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              {error ? (
                <FieldDescription className="text-destructive">
                  {error}
                </FieldDescription>
              ) : null}
              <Field>
                <Button disabled={isLoading} type="submit">
                  {isLoading ? "Входим..." : "Войти"}
                </Button>
                <FieldDescription className="text-center">
                  Доступ выдаётся администратором портала
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Внутренняя система предприятия. Не передавайте пароль третьим лицам.
      </FieldDescription>
    </div>
  )
}

"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PencilIcon } from "lucide-react"

export function ProfileEditDialog({ user, onUpdate }: { user: any, onUpdate?: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    workStatus: user.workStatus || "IN_OFFICE",
    location: user.location || "",
    bio: user.bio || "",
    skills: user.skills && Array.isArray(user.skills) ? user.skills.join(", ") : "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const skillsArray = formData.skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          skills: skillsArray,
        }),
      })

      if (response.ok) {
        setOpen(false)
        if (onUpdate) onUpdate()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <PencilIcon className="size-4" />
        Редактировать
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>
            Внесите изменения в свой профиль. Нажмите сохранить, когда закончите.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="status" className="text-sm font-medium">Статус</label>
            <Select 
              value={formData.workStatus} 
              onValueChange={(val) => setFormData(p => ({ ...p, workStatus: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_OFFICE">В офисе</SelectItem>
                <SelectItem value="REMOTE">Удаленно</SelectItem>
                <SelectItem value="VACATION">В отпуске</SelectItem>
                <SelectItem value="SICK_LEAVE">На больничном</SelectItem>
                <SelectItem value="BUSINESS_TRIP">В командировке</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="location" className="text-sm font-medium">Кабинет / Расположение</label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="bio" className="text-sm font-medium">О себе</label>
            <textarea
              id="bio"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.bio}
              onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="skills" className="text-sm font-medium">Навыки (через запятую)</label>
            <Input
              id="skills"
              value={formData.skills}
              onChange={(e) => setFormData(p => ({ ...p, skills: e.target.value }))}
              placeholder="AutoCAD, React, Английский"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>Сохранить изменения</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

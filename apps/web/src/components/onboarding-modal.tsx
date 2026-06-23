"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldAlertIcon, HeartHandshakeIcon, BriefcaseIcon, CheckCircleIcon, ArrowRightIcon } from "lucide-react"

type User = {
  id: string
  name: string
  isOnboarded: boolean
}

export function OnboardingModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnboarded: true }),
        credentials: "include",
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } catch (err) {
      console.error("Failed to complete onboarding", err)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step < 3) setStep(step + 1)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <div onClick={() => setOpen(true)} className="w-full">{trigger}</div>}
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center pb-2">
            {step === 1 && "Добро пожаловать!"}
            {step === 2 && "Важная информация"}
            {step === 3 && "Начнем работу"}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {step === 1 && "Мы рады видеть вас в команде. Давайте пройдем краткий инструктаж."}
            {step === 2 && "Охрана труда и техника безопасности — наш главный приоритет."}
            {step === 3 && "Ваш корпоративный портал готов к использованию."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center text-center">
          {step === 1 && (
            <div className="animate-in fade-in zoom-in duration-500">
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <HeartHandshakeIcon className="size-12 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Этот портал поможет вам быть в курсе всех новостей завода, быстро решать вопросы с IT и АХО, а также вести учет рабочего времени.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="size-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
                <ShieldAlertIcon className="size-12 text-orange-600" />
              </div>
              <ul className="text-sm text-left space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>Передвигайтесь по территории завода только по выделенным пешеходным зонам (зеленая разметка).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>В производственных цехах использование каски и сигнального жилета строго обязательно.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>При обнаружении неисправности оборудования немедленно сообщите мастеру участка.</span>
                </li>
              </ul>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="size-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <BriefcaseIcon className="size-12 text-green-600" />
              </div>
              <p className="text-muted-foreground mb-4">
                Не забудьте нажать кнопку <strong>«Начать работу»</strong> в правом верхнем углу, чтобы система начала учет вашего рабочего времени.
              </p>
              <div className="text-sm bg-primary/5 text-primary p-3 rounded-lg">
                Желаем успешного и безопасного дня!
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-1.5 justify-center w-full sm:w-auto sm:mr-auto py-2">
            <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'w-6 bg-primary' : 'w-2 bg-muted'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'w-6 bg-primary' : 'w-2 bg-muted'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? 'w-6 bg-primary' : 'w-2 bg-muted'}`} />
          </div>
          
          {step < 3 ? (
            <Button onClick={nextStep} className="w-full sm:w-auto">
              Далее
              <ArrowRightIcon className="size-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Завершение..." : "Понятно, начать работу!"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

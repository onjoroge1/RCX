'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createJourney } from '@/lib/actions/journeys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

export function NewJourneyForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [triggerSummary, setTriggerSummary] = useState('')
  const [description, setDescription] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await createJourney({ name, triggerSummary, description })
      if (!result.ok || !result.id) {
        toast('Journey not created', result.ok ? 'No journey ID returned.' : result.error, 'warning')
        return
      }
      toast('Journey created', 'A versioned draft with start and end nodes is ready to edit.')
      router.push(`/app/journeys/${result.id}`)
      router.refresh()
    })
  }

  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="journey-name" className="text-sm font-medium text-foreground">Journey name</label>
          <Input id="journey-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Appointment reschedule" className="mt-2" autoFocus />
        </div>
        <div>
          <label htmlFor="journey-trigger" className="text-sm font-medium text-foreground">Trigger summary</label>
          <Input id="journey-trigger" value={triggerSummary} onChange={(event) => setTriggerSummary(event.target.value)} placeholder="CRM: appointment due" className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">This is the human-readable trigger. Configure the runtime node in the builder.</p>
        </div>
        <div>
          <label htmlFor="journey-description" className="text-sm font-medium text-foreground">Description</label>
          <textarea
            id="journey-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What customer outcome should this journey complete?"
            rows={4}
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={() => router.push('/app/journeys')}>Cancel</Button>
          <Button type="submit" disabled={pending || name.trim().length < 2}>{pending ? 'Creating…' : 'Create journey'}</Button>
        </div>
      </form>
    </Card>
  )
}

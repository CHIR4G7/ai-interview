'use client'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Coins, Send, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_LENGTH = 1000

const RequestCreditsDialog = ({
  variant = 'default',
  className,
}: {
  variant?: 'default' | 'outline'
  className?: string
}) => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/request-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(data?.error ?? 'Could not send your request.')
        return
      }
      setSent(true)
      toast.success('Request sent. We will get back to you.')
    } catch (err) {
      console.error('Credit request failed:', err)
      toast.error('Could not send your request.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Reset a moment after closing so the success state is not visible
        // mid-animation on the way out.
        if (!next) setTimeout(() => { setSent(false); setMessage('') }, 200)
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Coins size={15} />
          Buy more credits
        </Button>
      </DialogTrigger>

      <DialogContent>
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <CheckCircle2 size={24} />
            </span>
            <DialogTitle className="text-lg font-bold">
              Request sent
            </DialogTitle>
            <DialogDescription className="max-w-sm text-sm">
              Thanks — we have your request and will be in touch by email.
            </DialogDescription>
            <Button variant="outline" onClick={() => setOpen(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="flex flex-col gap-2">
              <DialogTitle className="text-lg font-bold">
                Request more credits
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Paid top-ups are not available yet. Send a request and we will
                add credits to your account manually. Tell us a little about
                what you are preparing for.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 pt-1">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="e.g. I have final rounds at two companies next week and would like a few more practice interviews."
                className="min-h-[120px] rounded-xl"
              />
              <span className="text-right text-xs text-neutral-400">
                {message.length}/{MAX_LENGTH}
              </span>
            </div>

            <div className="flex flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={sending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-600 hover:to-purple-600"
              >
                <Send size={14} />
                {sending ? 'Sending…' : 'Send request'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default RequestCreditsDialog

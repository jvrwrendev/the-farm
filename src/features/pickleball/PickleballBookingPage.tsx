import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { addDays, format, parse } from 'date-fns'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Check, Clock, MapPin, ShieldCheck, Users } from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { DatePickerField } from '@/features/booking/DatePickerField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PaymentCheckout } from '@/features/payment/PaymentCheckout'
import { cn, formatCurrency } from '@/lib/utils'
import { PickleballAvailability } from './PickleballAvailability'
import { PickleballBookingSummary } from './PickleballBookingSummary'
import { PICKLEBALL_SETTINGS } from './mockData'
import { pickleballBookingSchema } from './schema'
import type { PickleballBooking, PickleballBookingInput } from './types'
import { usePickleballCourts } from './usePickleballCourts'
import { formatBookingDate, formatTimeRange, getAvailableEndTimes, getDurationHours, getPickleballRate, isSlotPast } from './utils'
import { createPickleballBooking, getPickleballBookedSlots } from '@/services/pickleballBooking.service'
import { getPickleballSettings } from '@/services/pickleballSettings.service'
import type { z } from 'zod'

type PickleballBookingForm = z.infer<typeof pickleballBookingSchema>

export default function PickleballBookingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const courts = usePickleballCourts()
  const [searchParams] = useSearchParams()
  const defaultBookingDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewValues, setReviewValues] = useState<PickleballBookingForm | null>(null)
  const [createdBooking, setCreatedBooking] = useState<PickleballBooking | null>(null)

  // Facility-wide exclusive (billiards-like flow)
  const [isExclusive, setIsExclusive] = useState(false)
  const [exclusiveDate, setExclusiveDate] = useState(defaultBookingDate)
  const [exclusiveName, setExclusiveName] = useState('')
  const [exclusiveEmail, setExclusiveEmail] = useState('')
  const [exclusiveContact, setExclusiveContact] = useState('')
  const [exclusivePlayers, setExclusivePlayers] = useState(2)
  const [exclusiveNotes, setExclusiveNotes] = useState('')

  const { data: facilitySettings } = useQuery({
    queryKey: ['pickleball-settings'],
    queryFn: getPickleballSettings,
  })
  const exclusiveEnabled = Boolean(facilitySettings?.exclusiveEnabled && (facilitySettings?.exclusiveRate24h ?? 0) > 0)
  const exclusiveRate = Number(facilitySettings?.exclusiveRate24h ?? 0)

  useEffect(() => {
    if (!exclusiveEnabled && isExclusive) setIsExclusive(false)
  }, [exclusiveEnabled, isExclusive])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const latestDate = addDays(today, PICKLEBALL_SETTINGS.bookingWindowDays)

  const { control, handleSubmit, setValue, register, formState: { errors } } = useForm<PickleballBookingForm>({
    resolver: zodResolver(pickleballBookingSchema),
    defaultValues: {
      customerName: '',
      email: '',
      contactNumber: '',
      courtId: '',
      bookingDate: defaultBookingDate,
      startTime: '',
      endTime: '',
      players: 2,
      notes: '',
    },
  })

  const formValues = useWatch({ control })
  const courtId = formValues.courtId ?? ''
  const bookingDate = formValues.bookingDate ?? ''
  const startTime = formValues.startTime ?? ''
  const endTime = formValues.endTime ?? ''
  const players = Number(formValues.players ?? 0)

  useEffect(() => {
    const requestedCourt = searchParams.get('court')
    if (requestedCourt && courts.some((c) => c.id === requestedCourt)) {
      setValue('courtId', requestedCourt, { shouldValidate: false })
    }
  }, [searchParams, courts, setValue])

  const court = useMemo(() => courts.find((c) => c.id === courtId), [courts, courtId])

  const availabilityQuery = useQuery({
    queryKey: ['pickleball-booked-slots', courtId, bookingDate],
    queryFn: () => getPickleballBookedSlots(courtId, bookingDate),
    enabled: Boolean(courtId && bookingDate && !isExclusive),
  })

  const bookedSlots = availabilityQuery.data ?? []
  const durationHours = getDurationHours(startTime, endTime)
  const regularTotal = getPickleballRate(court, bookingDate) * durationHours
  const total = isExclusive ? exclusiveRate : regularTotal

  const slots = useMemo(() => {
    if (!bookingDate) return []
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const open = parse(PICKLEBALL_SETTINGS.openTime, 'HH:mm', new Date())
    const close = parse(PICKLEBALL_SETTINGS.closeTime, 'HH:mm', new Date())
    const interval = PICKLEBALL_SETTINGS.slotMinutes
    const result: Array<{ startTime: string; endTime: string; status: 'available' | 'reserved' | 'past' }> = []
    let cursor = open
    while (cursor < close) {
      const s = format(cursor, 'HH:mm')
      const e = format(new Date(cursor.getTime() + interval * 60000), 'HH:mm')
      const [h, m] = s.split(':').map(Number)
      const slotMinutes = h * 60 + m
      const isPast = bookingDate < todayStr || (bookingDate === todayStr && slotMinutes <= nowMinutes)
      const isBooked = bookedSlots.some((b) => b.startTime < e && b.endTime > s)
      result.push({ startTime: s, endTime: e, status: isPast ? 'past' : isBooked ? 'reserved' : 'available' })
      cursor = new Date(cursor.getTime() + interval * 60000)
    }
    return result
  }, [bookingDate, bookedSlots])

  const endOptions = useMemo(() => (startTime ? getAvailableEndTimes(slots, startTime) : []), [slots, startTime])

  useEffect(() => {
    if (!endTime || !startTime) return
    if (!endOptions.some((o) => o.value === endTime)) {
      setValue('endTime', '', { shouldValidate: false })
    }
  }, [startTime, endOptions, endTime, setValue])

  const handleStartTimeChange = (value: string) => {
    setValue('startTime', value, { shouldValidate: true, shouldDirty: true })
    setValue('endTime', '', { shouldValidate: false })
  }

  const handleSlotSelect = (slot: { startTime: string; endTime: string }) => {
    handleStartTimeChange(slot.startTime)
    const options = getAvailableEndTimes(slots, slot.startTime)
    if (options.length > 0) {
      setValue('endTime', options[0].value, { shouldValidate: true, shouldDirty: true })
    }
  }

  const mutation = useMutation({
    mutationFn: async (input: PickleballBookingInput) => createPickleballBooking(input),
    onSuccess: (booking) => {
      setCreatedBooking(booking)
      setReviewOpen(false)
      setReviewValues(null)
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
      queryClient.invalidateQueries({ queryKey: ['pickleball-settings'] })
      toast.success('Reservation submitted!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking.')
    },
  })

  const handleReview = (values: PickleballBookingForm) => {
    if (isExclusive) return
    if (isSlotPast(values.bookingDate, values.startTime)) {
      toast.error('That time slot has already passed. Please pick a later time.')
      return
    }
    setReviewValues(values)
    setReviewOpen(true)
  }

  const handleExclusiveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!exclusiveEnabled) { toast.error('Exclusive 24-hour booking is not enabled.'); return }
    if (!exclusiveDate) { toast.error('Please select a date.'); return }
    if (!exclusiveName.trim() || !exclusiveEmail.trim() || !exclusiveContact.trim()) {
      toast.error('Please complete your details.')
      return
    }
    mutation.mutate({
      customerName: exclusiveName.trim(),
      email: exclusiveEmail.trim(),
      contactNumber: exclusiveContact.trim(),
      bookingDate: exclusiveDate,
      startTime: '00:00',
      endTime: '23:59',
      endDate: exclusiveDate,
      players: Number(exclusivePlayers) || 2,
      notes: exclusiveNotes.trim(),
      isExclusive: true,
    })
  }

  const handleConfirm = () => { if (!reviewValues) return; mutation.mutate(reviewValues) }

  const reviewCourt = reviewValues ? courts.find((c) => c.id === reviewValues.courtId) : undefined
  const reviewDuration = reviewValues ? getDurationHours(reviewValues.startTime, reviewValues.endTime) : 0
  const reviewTotal = getPickleballRate(reviewCourt, reviewValues?.bookingDate) * reviewDuration

  if (createdBooking) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Step 2 of 2</span>
            <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl">Complete your down payment</h1>
            <p className="mt-3 text-muted-foreground">
              Reservation <span className="font-mono font-semibold text-foreground">{createdBooking.reference}</span> created. Pay 50% now to secure your {createdBooking.isExclusive ? 'exclusive facility booking' : 'court'}.
            </p>
          </div>
          <PaymentCheckout bookingType="pickleball" bookingReference={createdBooking.reference} totalAmount={createdBooking.totalAmount} onSubmitted={() => navigate(`/pickleball/confirmation/${createdBooking.reference}`)} />
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="-ml-2"><Link to="/pickleball"><ArrowLeft className="h-4 w-4" />Back to pickleball</Link></Button>
          <div className="mx-auto mt-5 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Reserve a Court</span>
            <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">Book your pickleball session</h1>
            <p className="mt-4 text-muted-foreground">
              Choose a court and time{exclusiveEnabled ? ', or reserve the entire facility exclusively for 24 hours' : ''}.
            </p>
          </div>
        </div>

        {exclusiveEnabled && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Exclusive 24 Hours (All Pickleball Courts)</p>
                <p className="text-sm text-muted-foreground">Reserve the entire pickleball facility for a full day. Rate: {formatCurrency(exclusiveRate)} / 24 hrs</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={isExclusive} onChange={(e) => setIsExclusive(e.target.checked)} className="h-4 w-4" />
                Book exclusively
              </label>
            </CardContent>
          </Card>
        )}

        {isExclusive ? (
          <form onSubmit={handleExclusiveSubmit}>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader><CardTitle className="font-display text-xl">Exclusive 24-hour reservation</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">This reserves <strong>all pickleball courts</strong> for the selected date (full day).</p>
                    <div className="max-w-sm space-y-2">
                      <Label>Date</Label>
                      <DatePickerField value={exclusiveDate} onChange={setExclusiveDate} disabledDate={(date: Date) => date < today || date > latestDate} placeholder="Select date" ariaLabel="Pick exclusive date" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="font-display text-xl">Your details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2"><Label>Full name</Label><Input value={exclusiveName} onChange={(e) => setExclusiveName(e.target.value)} placeholder="Juan Dela Cruz" /></div>
                      <div className="space-y-2"><Label>Email</Label><Input type="email" value={exclusiveEmail} onChange={(e) => setExclusiveEmail(e.target.value)} placeholder="you@example.com" /></div>
                      <div className="space-y-2"><Label>Contact number</Label><Input value={exclusiveContact} onChange={(e) => setExclusiveContact(e.target.value)} placeholder="+63 9XX XXX XXXX" /></div>
                      <div className="space-y-2"><Label>Participants</Label><Input type="number" min={1} value={exclusivePlayers} onChange={(e) => setExclusivePlayers(Number(e.target.value))} /></div>
                      <div className="space-y-2 sm:col-span-2"><Label>Notes (optional)</Label><Textarea value={exclusiveNotes} onChange={(e) => setExclusiveNotes(e.target.value)} /></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card className="lg:sticky lg:top-28">
                  <CardHeader><CardTitle className="font-display text-lg">Booking summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">Exclusive 24 Hours</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Facility</span><span className="font-medium">All pickleball courts</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{exclusiveDate ? formatBookingDate(exclusiveDate, 'MMM d, yyyy') : '—'}</span></div>
                    <div className="border-t pt-3 flex justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(exclusiveRate)}</span></div>
                    <Button type="submit" size="lg" className="w-full rounded-full" disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Reserve exclusively'}</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit(handleReview)} noValidate>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-xl">Choose a court</CardTitle>
                    <p className="text-sm text-muted-foreground">Select a court to see availability and pricing.</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {courts.map((option) => {
                        const selected = option.id === courtId
                        return (
                          <button key={option.id} type="button" onClick={() => setValue('courtId', option.id, { shouldValidate: true, shouldDirty: true })} aria-pressed={selected} className={cn('group overflow-hidden rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/40 hover:shadow-sm')}>
                            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                              {option.imageUrl ? <img src={option.imageUrl} alt={option.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>}
                              {selected && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"><Check className="h-3.5 w-3.5" /></span>}
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-semibold text-foreground">{option.name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(option.hourlyRate)} / hour · up to {option.maxPlayers}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {errors.courtId?.message && <p className="mt-2 text-sm text-destructive">{errors.courtId.message}</p>}
                    {court && (
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1"><MapPin className="h-3 w-3 text-primary" />{court.surface}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1"><Users className="h-3 w-3 text-primary" />Up to {court.maxPlayers} players</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1"><Clock className="h-3 w-3 text-primary" />{PICKLEBALL_SETTINGS.slotMinutes}-minute slots</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-xl"><CalendarDays className="h-5 w-5 text-primary" />Pick a date and time</CardTitle>
                    <p className="text-sm text-muted-foreground">Availability is updated from reservations. Reserved slots cannot be selected.</p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="max-w-sm space-y-2">
                      <Label>Booking date</Label>
                      <DatePickerField value={bookingDate} onChange={(value: string) => { setValue('bookingDate', value, { shouldValidate: true, shouldDirty: true }); setValue('startTime', '', { shouldValidate: false }); setValue('endTime', '', { shouldValidate: false }) }} disabledDate={(date: Date) => date < today || date > latestDate} placeholder="Select a booking date" ariaLabel="Pick a pickleball booking date" />
                      {errors.bookingDate?.message && <p className="text-sm text-destructive">{errors.bookingDate.message}</p>}
                    </div>

                    {courtId && bookingDate ? (
                      <PickleballAvailability slots={slots} isLoading={availabilityQuery.isLoading} isError={availabilityQuery.isError} onRetry={() => availabilityQuery.refetch()} startTime={startTime} endTime={endTime} onStartTimeChange={(value) => { if (value) handleStartTimeChange(value) }} onEndTimeChange={(value) => { if (!value) return; setValue('endTime', value, { shouldValidate: true, shouldDirty: true }) }} onSlotSelect={handleSlotSelect} />
                    ) : (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Select a court and date to view available time slots.
                      </div>
                    )}
                    {(errors.startTime?.message || errors.endTime?.message) && (
                      <div className="space-y-1">
                        {errors.startTime?.message && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
                        {errors.endTime?.message && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
                      </div>
                    )}
                    {startTime && endTime && durationHours > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Holding {formatTimeRange(startTime, endTime)} ({durationHours} hour{durationHours === 1 ? '' : 's'}) for {court?.name ?? 'your court'} on {formatBookingDate(bookingDate)}.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="font-display text-xl">Your details</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="pickleball-customerName">Full name</Label><Input id="pickleball-customerName" placeholder="Juan Dela Cruz" error={errors.customerName?.message} {...register('customerName')} /></div>
                      <div className="space-y-2"><Label htmlFor="pickleball-email">Email address</Label><Input id="pickleball-email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} /></div>
                      <div className="space-y-2"><Label htmlFor="pickleball-contact">Contact number</Label><Input id="pickleball-contact" placeholder="+63 9XX XXX XXXX" error={errors.contactNumber?.message} {...register('contactNumber')} /></div>
                      <div className="space-y-2"><Label htmlFor="pickleball-players">Number of players</Label><Input id="pickleball-players" type="number" min={1} max={court?.maxPlayers ?? PICKLEBALL_SETTINGS.maxPlayers} error={errors.players?.message} {...register('players')} /></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="pickleball-notes">Additional notes (optional)</Label><Textarea id="pickleball-notes" error={errors.notes?.message} {...register('notes')} /></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-28">
                  <PickleballBookingSummary court={court} date={bookingDate} startTime={startTime} endTime={endTime} players={players} durationHours={durationHours} total={total} action={<Button type="submit" size="lg" className="w-full rounded-full">Review reservation</Button>} />
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Your slot is held only after you confirm.</div>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      <Dialog open={reviewOpen} onOpenChange={(open) => { if (!mutation.isPending) setReviewOpen(open) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review your reservation</DialogTitle>
            <DialogDescription>Check the details below. Your court will be held as pending until our team confirms it.</DialogDescription>
          </DialogHeader>
          {reviewValues && reviewCourt && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{reviewValues.customerName}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{reviewValues.email}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{reviewValues.contactNumber}</p>
              </div>
              <PickleballBookingSummary compact court={reviewCourt} date={reviewValues.bookingDate} startTime={reviewValues.startTime} endTime={reviewValues.endTime} players={Number(reviewValues.players)} durationHours={reviewDuration} total={reviewTotal} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={mutation.isPending}>Edit reservation</Button>
            <Button type="button" onClick={handleConfirm} loading={mutation.isPending}>Confirm reservation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  )
}

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { User, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimePicker12h } from '@/components/ui/time-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAccommodation } from '@/services/accommodation.service'
import { adminCreateBooking } from '@/services/admin.service'
import { BookingCalendar } from '@/components/calendar/BookingCalendar'
import { getCalendarEvents } from '@/services/resort.service'
import { PickleballAvailabilityCalendar } from '@/features/pickleball/PickleballAvailabilityCalendar'
import { ActivityAvailabilityCalendar } from '@/features/activities/ActivityAvailabilityCalendar'
import { createPickleballBooking, getPickleballBookedSlots } from '@/services/pickleballBooking.service'
import { createActivityBooking, listActivityBookings, listAllActivities, listActivityUnits } from '@/services/activity.service'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { ActivityBooking, ActivityType } from '@/features/activities/types'
import { formatTimeLabel as formatPickleballTime } from '@/features/pickleball/utils'
import { formatTimeLabel as formatActivityTime } from '@/features/activities/utils'
import { usePickleballCourts } from '@/features/pickleball/usePickleballCourts'

type Category = 'resort' | 'pickleball' | 'atv' | 'billiards'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCategory?: Category
  asPage?: boolean
  onSummaryChange?: (summary: {
    category: Category
    customerName: string
    email: string
    checkIn: string
    checkOut: string
    pbDate: string
    pbStart: string
    pbEnd: string
    actDate: string
    actStart: string
    actDuration: string
  }) => void
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'resort', label: 'Resort Accommodation' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'atv', label: 'ATV Rental' },
  { value: 'billiards', label: 'Billiards' },
]

const AdminManualBookingDialog = forwardRef<{ submit: () => void }, Props>(function AdminManualBookingDialog({ open, onOpenChange, initialCategory, asPage = false, onSummaryChange }, ref) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<Category>(initialCategory ?? 'resort')
  useEffect(() => {
    if (initialCategory) setCategory(initialCategory)
  }, [initialCategory])

  // Common customer fields
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Resort
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [checkInPeriod, setCheckInPeriod] = useState<'AM' | 'PM'>('AM')
  const [resortSelectedDate, setResortSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    if (resortSelectedDate) {
      setCheckIn(format(resortSelectedDate, 'yyyy-MM-dd'))
    }
  }, [resortSelectedDate])
  const { data: accommodation } = useQuery({ queryKey: ['accommodation'], queryFn: getAccommodation })
  const monthStart = format(new Date(), 'yyyy-MM-dd')
  const monthEnd = format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const { data: resortEvents = [] } = useQuery({
    queryKey: ['calendar-events', monthStart, monthEnd],
    queryFn: () => getCalendarEvents(monthStart, monthEnd),
  })

  // Pickleball
  const courts = usePickleballCourts(true)
  const [courtId, setCourtId] = useState('')
  const [pbDate, setPbDate] = useState('')
  const [pbStart, setPbStart] = useState('')
  const [pbEnd, setPbEnd] = useState('')
  const [pbPlayers, setPbPlayers] = useState('2')

  // Activity
  const [activityType, setActivityType] = useState<ActivityType>('billiards')
  const { data: activities = [] } = useQuery({ queryKey: ['activities', 'all'], queryFn: listAllActivities })
  const { data: units = [] } = useQuery({
    queryKey: ['activity-units', activityType],
    queryFn: () => listActivityUnits(activityType),
  })

  const { data: pickleballOccupied = [] } = useQuery({
    queryKey: ['pickleball-booked-slots', courtId, pbDate],
    queryFn: () => getPickleballBookedSlots(courtId, pbDate),
    enabled: Boolean(courtId && pbDate),
  })

  const [unitId, setUnitId] = useState('')
  const [actDate, setActDate] = useState('')
  const [actStart, setActStart] = useState('')
  const [actDuration, setActDuration] = useState('1')

  useEffect(() => {
    onSummaryChange?.({
      category,
      customerName,
      email,
      checkIn,
      checkOut,
      pbDate,
      pbStart,
      pbEnd,
      actDate,
      actStart,
      actDuration,
    })
  }, [category, customerName, email, checkIn, checkOut, pbDate, pbStart, pbEnd, actDate, actStart, actDuration, onSummaryChange])

  const [actPlayers, setActPlayers] = useState('2')

  const { data: activityBookingsForDate = [] } = useQuery({
    queryKey: ['activity-bookings', 'date', activityType, actDate],
    queryFn: () => listActivityBookings(activityType),
    enabled: Boolean(actDate),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!customerName.trim() || !email.trim()) throw new Error('Customer name and email are required.')
      if (category === 'resort') {
        if (!checkIn || !checkOut) throw new Error('Check-in and check-out dates are required.')
        const now = new Date()
        const todayStr = format(now, 'yyyy-MM-dd')
        if (checkIn === todayStr && checkInPeriod === 'AM' && now.getHours() >= 12) {
          throw new Error('The AM check-in period has already passed for today.')
        }
        const room = accommodation
        if (!room) throw new Error('Accommodation not found.')
        const booking = await adminCreateBooking({
          accommodationId: room.id,
          customerName: customerName.trim(),
          email: email.trim(),
          contactNumber: phone.trim() || 'N/A',
          checkIn,
          checkOut,
          checkInPeriod,
          guests: 1,
          adults: 1,
          children: 0,
          bookingType: 'walk_in',
          status: 'confirmed',
          paymentStatus: 'partially_paid',
          specialRequests: notes.trim(),
        })
        // set booking source to manual
        await supabase.from('bookings').update({ booking_source: 'manual' }).eq('id', booking.id)
        return booking.bookingReference
      }
      if (category === 'pickleball') {
        if (!courtId || !pbDate || !pbStart || !pbEnd) throw new Error('Court, date and time are required.')
        const conflict = pickleballOccupied.some((slot) => slot.startTime < pbEnd && slot.endTime > pbStart)
        if (conflict) throw new Error('Selected time slot is already booked. Please choose another time.')
        const now = new Date()
        if (pbDate === format(now, 'yyyy-MM-dd')) {
          const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
          if (toMin(pbStart) < now.getHours() * 60 + now.getMinutes()) {
            throw new Error('The selected start time has already passed.')
          }
        }
        const booking = await createPickleballBooking({
          customerName: customerName.trim(),
          email: email.trim(),
          contactNumber: phone.trim() || 'N/A',
          courtId,
          bookingDate: pbDate,
          startTime: pbStart,
          endTime: pbEnd,
          players: Number(pbPlayers) || 2,
          notes: notes.trim(),
        })
        await supabase.from('pickleball_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
        return booking.reference
      }
      // activity
      const type = activityType
      const activity = activities.find((a) => a.type === type)
      if (!activity) throw new Error('Activity not found.')
      if (!unitId || !actDate || !actStart) throw new Error('Unit, date and start time are required.')
      const endTime = (() => {
        const [h, m] = actStart.split(':').map(Number)
        const endH = h + Number(actDuration)
        return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      })()
      const conflict = activityBookingsForDate.some((b: ActivityBooking) =>
        b.unitId === unitId &&
        b.bookingDate === actDate &&
        b.startTime < endTime &&
        b.endTime > actStart,
      )
      if (conflict) throw new Error('This unit is already booked for the selected time. Please choose another slot.')
      const now = new Date()
      if (actDate === format(now, 'yyyy-MM-dd')) {
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
        if (toMin(actStart) < now.getHours() * 60 + now.getMinutes()) {
          throw new Error('The selected start time has already passed.')
        }
      }
      const booking = await createActivityBooking({
        activityId: activity.id,
        unitId,
        customerName: customerName.trim(),
        email: email.trim(),
        contactNumber: phone.trim() || 'N/A',
        bookingDate: actDate,
        startTime: actStart,
        endTime,
        durationHours: Number(actDuration),
        quantity: 1,
        players: Number(actPlayers) || 2,
        notes: notes.trim(),
      })
      await supabase.from('activity_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
      return booking.reference
    },
    onSuccess: (ref) => {
      toast.success(`Manual booking created: ${ref}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBookings() })
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking.')
    },
  })

  useImperativeHandle(ref, () => ({ submit: () => mutation.mutate() }), [mutation])

  const resetForm = () => {
    setCustomerName('')
    setEmail('')
    setPhone('')
    setNotes('')
    setCheckIn('')
    setCheckOut('')
    setCourtId('')
    setPbDate('')
    setPbStart('')
    setPbEnd('')
    setPbPlayers('2')
    setUnitId('')
    setActDate('')
    setActStart('')
    setActDuration('1')
    setActPlayers('2')
  }

  const LABELS: Record<Category, string> = {
    resort: 'Resort Accommodation',
    pickleball: 'Pickleball',
    atv: 'ATV Rental',
    billiards: 'Billiards',
  }

  const body = (
    <div className="space-y-8">
      {!asPage && (
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>Create a reservation on behalf of a customer. Source will be marked as Manual.</DialogDescription>
        </DialogHeader>
      )}

      <section className="rounded-xl border bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2 border-b pb-3">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Customer details</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="customerName">Customer name <span className="text-destructive">*</span></Label>
            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Juan Dela Cruz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 123 4567" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2 border-b pb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Booking details — {LABELS[category]}</h2>
        </div>

        {!asPage && (
          <div className="mb-5 space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {category === 'resort' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Check-in date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start font-normal">
                    {checkIn || 'Select check-in date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <BookingCalendar
                    events={resortEvents}
                    onDateSelect={(date) => {
                      setCheckIn(format(date, 'yyyy-MM-dd'))
                      setResortSelectedDate(date)
                    }}
                    selectedDate={checkIn ? new Date(checkIn) : null}
                    showGuestInfo={false}
                    showLegend={false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Check-out date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start font-normal">
                    {checkOut || 'Select check-out date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <BookingCalendar
                    events={resortEvents}
                    onDateSelect={(date) => {
                      const d = format(date, 'yyyy-MM-dd')
                      if (checkIn && d <= checkIn) {
                        toast.error('Check-out must be after check-in.')
                        return
                      }
                      setCheckOut(d)
                    }}
                    selectedDate={checkOut ? new Date(checkOut) : null}
                    showGuestInfo={false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Check-in period</Label>
              <Select value={checkInPeriod} onValueChange={(v) => setCheckInPeriod(v as 'AM' | 'PM')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {category === 'pickleball' && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Court <span className="text-destructive">*</span></Label>
              <Select value={courtId} onValueChange={setCourtId}>
                <SelectTrigger><SelectValue placeholder="Select court" /></SelectTrigger>
                <SelectContent>
                  {courts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start font-normal">
                      {pbDate || 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <PickleballAvailabilityCalendar compact onDateSelect={(d) => setPbDate(format(d, 'yyyy-MM-dd'))} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Start time <span className="text-destructive">*</span></Label>
                <TimePicker12h value={pbStart} onChange={setPbStart} minTime={pbDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined} />
              </div>
              <div className="space-y-1.5">
                <Label>End time <span className="text-destructive">*</span></Label>
                <TimePicker12h value={pbEnd} onChange={setPbEnd} minTime={pbDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined} />
                {pickleballOccupied.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Occupied: {pickleballOccupied.map((s) => `${formatPickleballTime(s.startTime)} – ${formatPickleballTime(s.endTime)}`).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Players</Label>
                <Input type="number" value={pbPlayers} onChange={(e) => setPbPlayers(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {(category === 'atv' || category === 'billiards') && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Activity type</Label>
                <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billiards">Billiards</SelectItem>
                    <SelectItem value="atv">ATV Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit / Table <span className="text-destructive">*</span></Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start font-normal">
                      {actDate || 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ActivityAvailabilityCalendar compact onDateSelect={(d) => setActDate(format(d, 'yyyy-MM-dd'))} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Start time <span className="text-destructive">*</span></Label>
                <TimePicker12h value={actStart} onChange={setActStart} minTime={actDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined} />
                {activityBookingsForDate.filter((b: ActivityBooking) => b.unitId === unitId && b.bookingDate === actDate && ['pending','confirmed','checked_in','completed'].includes(b.status)).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Occupied:{' '}
                    {activityBookingsForDate
                      .filter((b: ActivityBooking) => b.unitId === unitId && b.bookingDate === actDate && ['pending','confirmed','checked_in','completed'].includes(b.status))
                      .map((b: ActivityBooking) => `${formatActivityTime(b.startTime)} – ${formatActivityTime(b.endTime)}`)
                      .join(', ')}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Duration (hrs)</Label>
                <Select value={actDuration} onValueChange={setActDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <SelectItem key={h} value={String(h)}>{h} hour{h === 1 ? '' : 's'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Players</Label>
                <Input type="number" value={actPlayers} onChange={(e) => setActPlayers(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2 border-b pb-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Additional notes</h2>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requests, requests, or reminders…" />
        </div>
      </section>

      {!asPage && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Create booking</Button>
        </div>
      )}
    </div>
  )

  if (asPage) {
    return body
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {body}
      </DialogContent>
    </Dialog>
  )
})

export default AdminManualBookingDialog
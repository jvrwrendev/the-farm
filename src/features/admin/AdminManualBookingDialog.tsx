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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAccommodation } from '@/services/accommodation.service'
import { adminCreateBooking } from '@/services/admin.service'
import { BookingCalendar } from '@/components/calendar/BookingCalendar'
import { getCalendarEvents } from '@/services/resort.service'
import { PickleballAvailabilityCalendar } from '@/features/pickleball/PickleballAvailabilityCalendar'
import { ActivityAvailabilityCalendar } from '@/features/activities/ActivityAvailabilityCalendar'
import { createPickleballBooking, getPickleballBookedSlots } from '@/services/pickleballBooking.service'
import { getPickleballSettings } from '@/services/pickleballSettings.service'
import { createActivityBooking, listActivityBookings, listAllActivities, listActivityUnits } from '@/services/activity.service'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { ActivityBooking, ActivityType } from '@/features/activities/types'
import { formatTimeLabel as formatPickleballTime } from '@/features/pickleball/utils'
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
  useEffect(() => { if (initialCategory) setCategory(initialCategory) }, [initialCategory])

  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [checkInPeriod, setCheckInPeriod] = useState<'AM' | 'PM'>('AM')
  const [resortSelectedDate, setResortSelectedDate] = useState<Date | null>(null)
  useEffect(() => { if (resortSelectedDate) setCheckIn(format(resortSelectedDate, 'yyyy-MM-dd')) }, [resortSelectedDate])

  const { data: accommodation } = useQuery({ queryKey: ['accommodation'], queryFn: getAccommodation })
  const monthStart = format(new Date(), 'yyyy-MM-dd')
  const monthEnd = format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const { data: resortEvents = [] } = useQuery({ queryKey: ['calendar-events', monthStart, monthEnd], queryFn: () => getCalendarEvents(monthStart, monthEnd) })

  const courts = usePickleballCourts(true)
  const { data: pickleballSettings } = useQuery({ queryKey: ['pickleball-settings'], queryFn: getPickleballSettings })
  const pbFacilityExclusiveEnabled = Boolean(pickleballSettings?.exclusiveEnabled && (pickleballSettings?.exclusiveRate24h ?? 0) > 0)
  const [pbIsExclusive, setPbIsExclusive] = useState(false)
  const [courtId, setCourtId] = useState('')
  const [pbDate, setPbDate] = useState('')
  const [pbStart, setPbStart] = useState('13:00')
  const [pbEnd, setPbEnd] = useState('')
  const [pbPlayers, setPbPlayers] = useState('2')

  useEffect(() => { if (!pbFacilityExclusiveEnabled && pbIsExclusive) setPbIsExclusive(false) }, [pbFacilityExclusiveEnabled, pbIsExclusive])

  const [activityType, setActivityType] = useState<ActivityType>('billiards')
  useEffect(() => { if (category === 'atv') setActivityType('atv'); if (category === 'billiards') setActivityType('billiards') }, [category])
  const { data: activities = [] } = useQuery({ queryKey: ['activities', 'all'], queryFn: listAllActivities })
  const { data: units = [] } = useQuery({ queryKey: ['activity-units', activityType], queryFn: () => listActivityUnits(activityType) })
  const selectedActivity = activities.find((a) => a.type === activityType)
  const actExclusiveEnabled = activityType === 'billiards' && Boolean(selectedActivity?.exclusiveEnabled && (selectedActivity?.exclusiveRate24h ?? 0) > 0)
  const [actIsExclusive, setActIsExclusive] = useState(false)

  const { data: pickleballOccupied = [] } = useQuery({
    queryKey: ['pickleball-booked-slots', courtId, pbDate],
    queryFn: () => getPickleballBookedSlots(courtId, pbDate),
    enabled: Boolean(courtId && pbDate && !pbIsExclusive),
  })

  const [unitId, setUnitId] = useState('')
  const [actDate, setActDate] = useState('')
  const [actStart, setActStart] = useState('')
  const [actDuration, setActDuration] = useState('1')
  const [actPlayers, setActPlayers] = useState('2')

  const { data: activityBookingsForDate = [] } = useQuery({
    queryKey: ['activity-bookings', 'date', activityType, actDate],
    queryFn: () => listActivityBookings(activityType),
    enabled: Boolean(actDate),
  })

  useEffect(() => {
    onSummaryChange?.({
      category,
      customerName,
      email,
      checkIn,
      checkOut,
      pbDate,
      pbStart: pbIsExclusive ? '00:00' : pbStart,
      pbEnd: pbIsExclusive ? '23:59' : pbEnd,
      actDate,
      actStart: actIsExclusive ? '00:00' : actStart,
      actDuration: actIsExclusive ? '24' : actDuration,
    })
  }, [category, customerName, email, checkIn, checkOut, pbDate, pbStart, pbEnd, actDate, actStart, actDuration, onSummaryChange, pbIsExclusive, actIsExclusive])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!customerName.trim() || !email.trim()) throw new Error('Customer name and email are required.')
      if (category === 'resort') {
        if (!checkIn || !checkOut) throw new Error('Check-in and check-out dates are required.')
        const room = accommodation
        if (!room) throw new Error('Accommodation not found.')
        const booking = await adminCreateBooking({ accommodationId: room.id, customerName: customerName.trim(), email: email.trim(), contactNumber: phone.trim() || 'N/A', checkIn, checkOut, checkInPeriod, guests: 1, adults: 1, children: 0, bookingType: 'walk_in', status: 'confirmed', paymentStatus: 'partially_paid', specialRequests: notes.trim() })
        await supabase.from('bookings').update({ booking_source: 'manual' }).eq('id', booking.id)
        return booking.bookingReference
      }
      if (category === 'pickleball') {
        if (!pbDate) throw new Error('Date is required.')
        if (pbIsExclusive) {
          if (!pbFacilityExclusiveEnabled) throw new Error('Exclusive 24-hour booking is not enabled.')
          const booking = await createPickleballBooking({
            customerName: customerName.trim(),
            email: email.trim(),
            contactNumber: phone.trim() || 'N/A',
            bookingDate: pbDate,
            startTime: '00:00',
            endTime: '23:59',
            endDate: pbDate,
            players: Number(pbPlayers) || 2,
            notes: notes.trim(),
            isExclusive: true,
          } as any)
          await supabase.from('pickleball_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
          return booking.reference
        }
        if (!courtId || !pbStart || !pbEnd) throw new Error('Court, date and time are required.')
        const conflict = pickleballOccupied.some((slot) => slot.startTime < pbEnd && slot.endTime > pbStart)
        if (conflict) throw new Error('Selected time slot is already booked. Please choose another time.')
        const booking = await createPickleballBooking({ customerName: customerName.trim(), email: email.trim(), contactNumber: phone.trim() || 'N/A', courtId, bookingDate: pbDate, startTime: pbStart, endTime: pbEnd, players: Number(pbPlayers) || 2, notes: notes.trim() })
        await supabase.from('pickleball_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
        return booking.reference
      }
      const type = category === 'atv' ? 'atv' : 'billiards'
      const activity = activities.find((a) => a.type === type)
      if (!activity) throw new Error('Activity not found.')
      if (!actDate) throw new Error('Date is required.')
      if (actIsExclusive) {
        if (!actExclusiveEnabled) throw new Error('Exclusive 24-hour booking is not enabled.')
        const booking = await createActivityBooking({ activityId: activity.id, customerName: customerName.trim(), email: email.trim(), contactNumber: phone.trim() || 'N/A', bookingDate: actDate, startTime: '00:00', endTime: '23:59', durationHours: 24, quantity: 1, players: Number(actPlayers) || 2, notes: notes.trim(), isExclusive: true } as any)
        await supabase.from('activity_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
        return booking.reference
      }
      if (!unitId || !actStart) throw new Error('Unit, date and start time are required.')
      const endTime = (() => { const [h, m] = actStart.split(':').map(Number); const endH = h + Number(actDuration); return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}` })()
      const conflict = activityBookingsForDate.some((b: ActivityBooking) => b.unitId === unitId && b.bookingDate === actDate && b.startTime < endTime && b.endTime > actStart)
      if (conflict) throw new Error('This unit is already booked for the selected time. Please choose another slot.')
      const booking = await createActivityBooking({ activityId: activity.id, unitId, customerName: customerName.trim(), email: email.trim(), contactNumber: phone.trim() || 'N/A', bookingDate: actDate, startTime: actStart, endTime, durationHours: Number(actDuration), quantity: 1, players: Number(actPlayers) || 2, notes: notes.trim() })
      await supabase.from('activity_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
      return booking.reference
    },
    onSuccess: (refCode) => {
      toast.success(`Manual booking created: ${refCode}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBookings() })
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Failed to create booking.'),
  })

  useImperativeHandle(ref, () => ({ submit: () => mutation.mutate() }), [mutation])

  const resetForm = () => {
    setCustomerName(''); setEmail(''); setPhone(''); setNotes(''); setCheckIn(''); setCheckOut(''); setCourtId(''); setPbDate(''); setPbStart('13:00'); setPbEnd(''); setPbPlayers('2'); setUnitId(''); setActDate(''); setActStart(''); setActDuration('1'); setActPlayers('2'); setPbIsExclusive(false); setActIsExclusive(false)
  }

  const LABELS: Record<Category, string> = { resort: 'Resort Accommodation', pickleball: 'Pickleball', atv: 'ATV Rental', billiards: 'Billiards' }

  const body = (
    <div className="space-y-8">
      {!asPage && (
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>Create a reservation on behalf of a customer. Source will be marked as Manual.</DialogDescription>
        </DialogHeader>
      )}

      <section className="rounded-xl border bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2 border-b pb-3"><User className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">Customer details</h2></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="customerName">Customer name <span className="text-destructive">*</span></Label><Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="email">Email <span className="text-destructive">*</span></Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
      </section>

      <section className="rounded-xl border bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2 border-b pb-3"><Calendar className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">Booking details — {LABELS[category]}</h2></div>
        {!asPage && (
          <div className="mb-5 space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {category === 'resort' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Check-in date <span className="text-destructive">*</span></Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start font-normal">{checkIn || 'Select check-in date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><BookingCalendar events={resortEvents} onDateSelect={(date) => { setCheckIn(format(date, 'yyyy-MM-dd')); setResortSelectedDate(date) }} selectedDate={checkIn ? new Date(checkIn) : null} showGuestInfo={false} showLegend={false} /></PopoverContent></Popover></div>
            <div className="space-y-1.5"><Label>Check-out date <span className="text-destructive">*</span></Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start font-normal">{checkOut || 'Select check-out date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><BookingCalendar events={resortEvents} onDateSelect={(date) => { const d = format(date, 'yyyy-MM-dd'); if (checkIn && d <= checkIn) { toast.error('Check-out must be after check-in.'); return } setCheckOut(d) }} selectedDate={checkOut ? new Date(checkOut) : null} showGuestInfo={false} /></PopoverContent></Popover></div>
            <div className="space-y-1.5"><Label>Check-in period</Label><Select value={checkInPeriod} onValueChange={(v) => setCheckInPeriod(v as 'AM' | 'PM')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></div>
          </div>
        )}

        {category === 'pickleball' && (
          <div className="space-y-5">
            {pbFacilityExclusiveEnabled && (
              <label className="flex items-center gap-2 text-sm font-medium rounded-lg border border-primary/20 bg-primary/5 p-3">
                <input type="checkbox" checked={pbIsExclusive} onChange={(e) => setPbIsExclusive(e.target.checked)} />
                Exclusive 24 Hours (reserve all pickleball courts for the full day)
              </label>
            )}

            {!pbIsExclusive && (
              <div className="space-y-1.5">
                <Label>Court <span className="text-destructive">*</span></Label>
                <Select value={courtId} onValueChange={setCourtId}>
                  <SelectTrigger><SelectValue placeholder="Select court" /></SelectTrigger>
                  <SelectContent>{courts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Date <span className="text-destructive">*</span></Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start font-normal">{pbDate || 'Select date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><PickleballAvailabilityCalendar compact onDateSelect={(d) => setPbDate(format(d, 'yyyy-MM-dd'))} /></PopoverContent></Popover></div>
              {!pbIsExclusive && (
                <>
                  <div className="space-y-1.5"><Label>Start time <span className="text-destructive">*</span></Label><TimePicker12h value={pbStart} onChange={setPbStart} /></div>
                  <div className="space-y-1.5"><Label>End time <span className="text-destructive">*</span></Label><TimePicker12h value={pbEnd} onChange={setPbEnd} />{pickleballOccupied.length > 0 && <p className="text-xs text-muted-foreground">Occupied: {pickleballOccupied.map((s) => `${formatPickleballTime(s.startTime)} – ${formatPickleballTime(s.endTime)}`).join(', ')}</p>}</div>
                </>
              )}
              {pbIsExclusive && (
                <div className="space-y-1.5"><Label>Duration</Label><Input value="24 hours (full day)" disabled /></div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Players</Label><Input type="number" value={pbPlayers} onChange={(e) => setPbPlayers(e.target.value)} /></div></div>
          </div>
        )}

        {(category === 'atv' || category === 'billiards') && (
          <div className="space-y-5">
            {category === 'billiards' && actExclusiveEnabled && (
              <label className="flex items-center gap-2 text-sm font-medium rounded-lg border border-primary/20 bg-primary/5 p-3">
                <input type="checkbox" checked={actIsExclusive} onChange={(e) => setActIsExclusive(e.target.checked)} />
                Exclusive 24 Hours (reserve all billiard tables for the full day)
              </label>
            )}
            {!actIsExclusive && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Activity type</Label><Select value={category === 'atv' ? 'atv' : 'billiards'} onValueChange={(v) => setActivityType(v as ActivityType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="billiards">Billiards</SelectItem><SelectItem value="atv">ATV Rental</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Unit / Table <span className="text-destructive">*</span></Label><Select value={unitId} onValueChange={setUnitId}><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger><SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
            <div className={`grid grid-cols-1 gap-4 ${actIsExclusive ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              <div className="space-y-1.5"><Label>Date <span className="text-destructive">*</span></Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start font-normal">{actDate || 'Select date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><ActivityAvailabilityCalendar compact onDateSelect={(d) => setActDate(format(d, 'yyyy-MM-dd'))} /></PopoverContent></Popover></div>
              {!actIsExclusive && (
                <>
                  <div className="space-y-1.5"><Label>Start time <span className="text-destructive">*</span></Label><TimePicker12h value={actStart} onChange={setActStart} /></div>
                  <div className="space-y-1.5"><Label>Duration (hrs)</Label><Select value={actDuration} onValueChange={setActDuration}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <SelectItem key={h} value={String(h)}>{h} hour{h === 1 ? '' : 's'}</SelectItem>)}</SelectContent></Select></div>
                </>
              )}
              {actIsExclusive && <div className="space-y-1.5"><Label>Duration</Label><Input value="24 hours (full day)" disabled /></div>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Players</Label><Input type="number" value={actPlayers} onChange={(e) => setActPlayers(e.target.value)} /></div></div>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2 border-b pb-3"><FileText className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">Additional notes</h2></div>
        <div className="space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </section>

      {!asPage && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Create booking</Button>
        </div>
      )}
    </div>
  )

  if (asPage) return body
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">{body}</DialogContent></Dialog>
})

export default AdminManualBookingDialog

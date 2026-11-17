import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Receipt } from 'lucide-react'
import AdminManualBookingDialog from './AdminManualBookingDialog'

type Category = 'resort' | 'pickleball' | 'atv' | 'billiards'

const LABELS: Record<Category, string> = {
  resort: 'Resort Accommodation',
  pickleball: 'Pickleball',
  atv: 'ATV Rental',
  billiards: 'Billiards',
}

interface Summary {
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
}

function SectionRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[55%]">{value || '—'}</span>
    </div>
  )
}

export default function AdminManualBookingPage() {
  const navigate = useNavigate()
  const { category = 'resort' } = useParams<{ category: string }>()
  const cat = (['resort', 'pickleball', 'atv', 'billiards'].includes(category) ? category : 'resort') as Category
  const dialogRef = useRef<{ submit: () => void }>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  const displayDate = summary ? (cat === 'resort' ? summary.checkIn : (summary.pbDate || summary.actDate)) : ''

  return (
    <div className="flex min-h-screen flex-col">
      <div className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bookings')}>
              <ArrowLeft className="h-4 w-4" /> Back to bookings
            </Button>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Manual booking</p>
              <h1 className="font-display text-2xl font-bold leading-tight">{LABELS[cat]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/bookings')}>Cancel</Button>
            <Button onClick={() => dialogRef.current?.submit()}>Create booking</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="rounded-2xl border bg-card p-6 sm:p-8">
              <AdminManualBookingDialog
                ref={dialogRef}
                open={true}
                onOpenChange={(o) => { if (!o) navigate('/admin/bookings') }}
                initialCategory={cat}
                asPage={true}
                onSummaryChange={setSummary}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Booking summary</h2>
              </div>
              <div className="space-y-3">
                <SectionRow label="Category" value={LABELS[cat]} />
                <SectionRow label="Source" value="Manual" />
                <SectionRow label="Customer" value={summary?.customerName} />
                <SectionRow label="Email" value={summary?.email} />
                {cat === 'resort' ? (
                  <>
                    <SectionRow label="Check-in" value={summary?.checkIn} />
                    <SectionRow label="Check-out" value={summary?.checkOut} />
                  </>
                ) : (
                  <>
                    <SectionRow label="Date" value={displayDate} />
                    <SectionRow
                      label="Time"
                      value={
                        cat === 'pickleball'
                          ? summary?.pbStart && summary?.pbEnd
                            ? `${summary.pbStart} – ${summary.pbEnd}`
                            : undefined
                          : summary?.actStart
                            ? `${summary.actStart} – ${String(Number(summary.actStart.split(':')[0]) + Number(summary.actDuration || 1)).padStart(2, '0')}:${summary.actStart.split(':')[1]}`
                            : undefined
                      }
                    />
                    <SectionRow label="Duration" value={cat === 'pickleball' ? (summary?.pbStart && summary?.pbEnd ? `${(Number(summary.pbEnd.split(':')[0]) - Number(summary.pbStart.split(':')[0]))} hour(s)` : undefined) : `${summary?.actDuration || 1} hour(s)`} />
                  </>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Review the details before creating the reservation. The booking will be saved with Manual source.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
import { useState } from 'react'
import { Eye, Loader2, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PickleballBooking, PickleballBookingStatus } from '../types'
import { usePickleballStatusMutation } from '../usePickleballStatusMutation'
import { approveBooking } from '@/services/payment.service'
import { sendBookingConfirmation } from '@/services/email.service'

const VARIANTS: Record<PickleballBookingStatus, 'default' | 'outline' | 'destructive'> = {
  pending: 'outline',
  confirmed: 'default',
  checked_in: 'default',
  completed: 'outline',
  cancelled: 'destructive',
  rejected: 'destructive',
}

function nextPickleballStatuses(
  status: PickleballBookingStatus,
): PickleballBookingStatus[] {
  switch (status) {
    case 'pending':
      return ['confirmed', 'cancelled']
    case 'confirmed':
      return ['checked_in', 'cancelled']
    case 'checked_in':
      return ['completed']
    default:
      return []
  }
}

function actionLabel(current: PickleballBookingStatus, target: PickleballBookingStatus): string {
  if (target === 'confirmed') return 'Approve reservation'
  if (target === 'checked_in') return 'Check in'
  if (target === 'completed') return 'Check out'
  if (target === 'cancelled') {
    return current === 'pending' ? 'Reject reservation' : 'Cancel reservation'
  }
  return 'Mark as pending'
}

function shortLabel(current: PickleballBookingStatus, target: PickleballBookingStatus): string {
  if (target === 'confirmed') return 'Approve'
  if (target === 'checked_in') return 'Check-in'
  if (target === 'completed') return 'Check-out'
  if (target === 'cancelled') return current === 'pending' ? 'Reject' : 'Cancel'
  return 'Pending'
}

interface PickleballBookingActionsProps {
  booking: PickleballBooking
  onView?: (booking: PickleballBooking) => void
  onStatusChanged?: (booking: PickleballBooking) => void
  variant?: 'inline' | 'menu'
}

export function PickleballBookingActions({
  booking,
  onView,
  onStatusChanged,
  variant = 'inline',
}: PickleballBookingActionsProps) {
  const mutation = usePickleballStatusMutation(onStatusChanged)
  const queryClient = useQueryClient()
  const [approving, setApproving] = useState(false)
  const statuses = nextPickleballStatuses(booking.status)
  const busy = mutation.isPending || approving

  const handleAction = async (status: PickleballBookingStatus) => {
    if (status === 'confirmed' && booking.status === 'pending') {
      setApproving(true)
      try {
        await approveBooking('pickleball', booking.reference)
        toast.success(`${booking.reference} approved.`)
        try {
          const res = await sendBookingConfirmation('pickleball', booking.reference)
          if (res?.status === 'failed') toast.warning('Approved, but confirmation email failed to send.')
        } catch (err) {
          toast.warning(`Approved, but confirmation email could not be sent: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        queryClient.invalidateQueries({ queryKey: ['pickleball'] })
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
        queryClient.invalidateQueries({ queryKey: ['payment-records'] })
        onStatusChanged?.({ ...booking, status: 'confirmed' })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to approve booking.')
      } finally {
        setApproving(false)
      }
      return
    }
    mutation.mutate({ reference: booking.reference, status })
  }

  if (variant === 'menu') {
    return (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              aria-label={`Actions for ${booking.reference}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{booking.reference}</DropdownMenuLabel>
            {onView && (
              <DropdownMenuItem onSelect={() => onView(booking)}>
                <Eye />
                View details
              </DropdownMenuItem>
            )}
            {onView && statuses.length > 0 && <DropdownMenuSeparator />}
            {statuses.map((status) => {
              const isActive =
                (mutation.isPending &&
                  mutation.variables?.reference === booking.reference &&
                  mutation.variables?.status === status) ||
                (approving && status === 'confirmed')

              return (
                <DropdownMenuItem
                  key={status}
                  variant={status === 'cancelled' ? 'destructive' : 'default'}
                  disabled={busy}
                  onSelect={() => void handleAction(status)}
                >
                  {isActive ? <Loader2 className="animate-spin" /> : null}
                  {actionLabel(booking.status, status)}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  if (statuses.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        This reservation has no further status changes.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map((status) => {
        return (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={VARIANTS[status]}
            loading={
              (mutation.isPending &&
                mutation.variables?.reference === booking.reference &&
                mutation.variables?.status === status) ||
              (approving && status === 'confirmed')
            }
            onClick={() => void handleAction(status)}
            disabled={busy}
          >
            {shortLabel(booking.status, status)}
          </Button>
        )
      })}
    </div>
  )
}
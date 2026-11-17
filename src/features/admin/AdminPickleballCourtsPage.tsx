import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  listAllPickleballCourts,
  deletePickleballCourt,
  togglePickleballCourtStatus,
} from '@/services/pickleballCourt.service'
import { listPickleballBookings } from '@/services/pickleballBooking.service'
import type { PickleballCourt } from '@/features/pickleball/types'

export default function AdminPickleballCourtsPage() {
  const navigate = useNavigate()
  const [courts, setCourts] = useState<PickleballCourt[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<PickleballCourt | null>(null)

  const fetchCourts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAllPickleballCourts()
      setCourts(data)
    } catch {
      toast.error('Failed to load courts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourts()
  }, [fetchCourts])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const bookings = await listPickleballBookings()
      if (bookings.some((booking) => booking.courtId === deleteTarget.id)) {
        toast.error(
          'This court has existing reservations and cannot be deleted. Deactivate it instead.',
        )
        setDeleteTarget(null)
        return
      }
      await deletePickleballCourt(deleteTarget.id)
      setCourts((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Court deleted.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete court.')
    }
  }

  const handleToggleActive = async (court: PickleballCourt) => {
    try {
      const updated = await togglePickleballCourtStatus(court.id, !court.isActive)
      setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      toast.success(updated.isActive ? 'Court activated.' : 'Court deactivated.')
    } catch {
      toast.error('Failed to update status.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Pickleball Courts</h2>
          <p className="text-sm text-muted-foreground">Manage court details, pricing, and availability.</p>
        </div>
        <Button onClick={() => navigate('/admin/pickleball-courts/new')}>
          <Plus className="h-4 w-4" /> Add Court
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading courts…</div>
      ) : courts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-medium">No courts yet</p>
            <p className="text-sm text-muted-foreground">Add a court to get started.</p>
            <Button onClick={() => navigate('/admin/pickleball-courts/new')}>
              <Plus className="h-4 w-4" /> Add Court
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => (
            <Card key={court.id} className="overflow-hidden">
              {court.imageUrl && (
                <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                  <img src={court.imageUrl} alt={court.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{court.name}</p>
                    <p className="text-xs text-muted-foreground">{court.tagline}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      court.isActive ? 'bg-emerald-500/90 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {court.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{court.description}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-1">₱{court.hourlyRate}/hr</span>
                  <span className="rounded-full bg-muted px-2 py-1">WD ₱{court.weekdayRate}</span>
                  <span className="rounded-full bg-muted px-2 py-1">WE ₱{court.weekendRate}</span>
                  <span className="rounded-full bg-muted px-2 py-1">Max {court.maxPlayers}</span>
                  <span className="rounded-full bg-muted px-2 py-1">{court.surface}</span>
                  <span className="rounded-full bg-muted px-2 py-1">{court.isCovered ? 'Covered' : 'Outdoor'}</span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {court.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/pickleball-courts/edit/${court.id}`)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(court)}
                    title={court.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {court.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(court)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Court</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete “{deleteTarget?.name}”? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

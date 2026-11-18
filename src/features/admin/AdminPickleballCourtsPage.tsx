import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  listAllPickleballCourts,
  deletePickleballCourt,
  togglePickleballCourtStatus,
} from '@/services/pickleballCourt.service'
import { listPickleballBookings } from '@/services/pickleballBooking.service'
import {
  getPickleballSettings,
  updatePickleballSettings,
  type PickleballSettings,
} from '@/services/pickleballSettings.service'
import type { PickleballCourt } from '@/features/pickleball/types'

export default function AdminPickleballCourtsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [courts, setCourts] = useState<PickleballCourt[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<PickleballCourt | null>(null)

  const [settingsForm, setSettingsForm] = useState<PickleballSettings>({
    exclusiveEnabled: false,
    exclusiveRate24h: 0,
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['pickleball-settings'],
    queryFn: getPickleballSettings,
  })

  useEffect(() => {
    if (settings) setSettingsForm(settings)
  }, [settings])

  const load = useCallback(async () => {
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

  useEffect(() => { void load() }, [load])

  const handleToggleActive = async (court: PickleballCourt) => {
    try {
      const updated = await togglePickleballCourtStatus(court.id, !court.isActive)
      setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      toast.success(updated.isActive ? 'Court activated.' : 'Court deactivated.')
    } catch {
      toast.error('Failed to update status.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const bookings = await listPickleballBookings()
      const hasReservations = bookings.some(
        (b) => b.courtId === deleteTarget.id && b.status !== 'cancelled' && b.status !== 'rejected',
      )
      if (hasReservations) {
        toast.error('Cannot delete court with existing reservations.')
        setDeleteTarget(null)
        return
      }
      await deletePickleballCourt(deleteTarget.id)
      setCourts((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Court deleted.')
    } catch {
      toast.error('Failed to delete court.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const saveSettings = async () => {
    if (settingsForm.exclusiveEnabled && Number(settingsForm.exclusiveRate24h) <= 0) {
      toast.error('Please enter a valid exclusive 24-hour rate.')
      return
    }
    setSavingSettings(true)
    try {
      const saved = await updatePickleballSettings({
        exclusiveEnabled: Boolean(settingsForm.exclusiveEnabled),
        exclusiveRate24h: Number(settingsForm.exclusiveRate24h || 0),
      })
      setSettingsForm(saved)
      queryClient.invalidateQueries({ queryKey: ['pickleball-settings'] })
      toast.success('Pickleball settings saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="font-display text-lg">Pickleball Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure facility-wide options for pickleball bookings.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 p-5 sm:p-6">
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
              <div>
                <p className="font-semibold">Exclusive 24 Hours (Entire Facility)</p>
                <p className="text-xs text-muted-foreground">
                  Allow customers/admins to reserve all pickleball courts for a full day (24 hours), same flow as Billiards exclusive booking.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={settingsForm.exclusiveEnabled}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, exclusiveEnabled: e.target.checked }))
                  }
                />
                Enable Exclusive 24-hour booking
              </label>
              <div className="max-w-xs space-y-2">
                <Label>Exclusive 24-hour rate</Label>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.exclusiveRate24h}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, exclusiveRate24h: Number(e.target.value) }))
                  }
                  disabled={!settingsForm.exclusiveEnabled}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSettings} loading={savingSettings}>
                  Save settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
        <div className="py-12 text-center text-muted-foreground">Loading courts…</div>
      ) : courts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No courts yet. Add your first court.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => (
            <Card key={court.id} className="overflow-hidden">
              {court.imageUrl && (
                <img src={court.imageUrl} alt={court.name} className="h-40 w-full object-cover" />
              )}
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{court.name}</h3>
                    {court.tagline && <p className="text-xs text-muted-foreground">{court.tagline}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${court.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {court.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-1">₱{court.hourlyRate}/hr</span>
                  {court.surface && <span className="rounded-full bg-muted px-2 py-1">{court.surface}</span>}
                  <span className="rounded-full bg-muted px-2 py-1">Max {court.maxPlayers}</span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {court.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/pickleball-courts/edit/${court.id}`)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(court)} title={court.isActive ? 'Deactivate' : 'Activate'}>
                    {court.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(court)} title="Delete" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete court</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

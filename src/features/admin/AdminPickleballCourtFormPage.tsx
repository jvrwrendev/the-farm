import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimePicker12h } from '@/components/ui/time-picker'
import { toast } from 'sonner'
import {
  listAllPickleballCourts,
  createPickleballCourt,
  updatePickleballCourt,
  uploadPickleballCourtImage,
  type CourtInput,
} from '@/services/pickleballCourt.service'

const ACCEPTED_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

const emptyForm: CourtInput = {
  name: '',
  tagline: '',
  description: '',
  imageUrl: '',
  hourlyRate: 0,
  weekdayRate: 0,
  weekendRate: 0,
  maxPlayers: 4,
  surface: '',
  isCovered: false,
  amenities: [],
  isAvailable: true,
  isActive: true,
  openTime: '07:00',
  closeTime: '21:00',
}

export default function AdminPickleballCourtFormPage() {
  const navigate = useNavigate()
  const { courtId } = useParams<{ courtId: string }>()
  const isEdit = Boolean(courtId)

  const [form, setForm] = useState<CourtInput>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [amenityInput, setAmenityInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!courtId) return
    let cancelled = false
    listAllPickleballCourts()
      .then((courts) => {
        if (cancelled) return
        const court = courts.find((c) => c.id === courtId)
        if (!court) {
          toast.error('Court not found.')
          navigate('/admin/pickleball-courts')
          return
        }
        setForm({
          name: court.name,
          tagline: court.tagline,
          description: court.description,
          imageUrl: court.imageUrl,
          hourlyRate: court.hourlyRate,
          weekdayRate: court.weekdayRate,
          weekendRate: court.weekendRate,
          maxPlayers: court.maxPlayers,
          surface: court.surface,
          isCovered: court.isCovered,
          amenities: court.amenities,
          isAvailable: court.isAvailable,
          isActive: court.isActive,
          openTime: court.openTime,
          closeTime: court.closeTime,
        })
        setImagePreview(court.imageUrl)
      })
      .catch(() => toast.error('Failed to load court.'))
      .finally(() => setLoading(false))
    return () => { cancelled = true }
  }, [courtId, navigate])

  const handleImageSelected = (file: File) => {
    if (!ACCEPTED_IMAGES.includes(file.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.onerror = () => toast.error('Could not read file.')
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setForm((prev) => ({ ...prev, imageUrl: '' }))
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addAmenity = () => {
    const v = amenityInput.trim()
    if (!v) return
    if (form.amenities?.includes(v)) return
    setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] }))
    setAmenityInput('')
  }

  const removeAmenity = (a: string) => {
    setForm((f) => ({ ...f, amenities: (f.amenities ?? []).filter((x) => x !== a) }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Court name is required.')
      return
    }
    setSaving(true)
    try {
      let imageUrl = form.imageUrl
      if (imageFile) {
        setUploadingImage(true)
        try {
          imageUrl = await uploadPickleballCourtImage(imageFile)
        } finally {
          setUploadingImage(false)
        }
      }
      const { exclusiveEnabled: _exclusiveEnabled, exclusiveRate24h: _exclusiveRate24h, ...courtPayload } = { ...form, imageUrl }
      void _exclusiveEnabled
      void _exclusiveRate24h
      if (courtId) {
        await updatePickleballCourt(courtId, courtPayload)
        toast.success('Court updated.')
      } else {
        await createPickleballCourt(courtPayload)
        toast.success('Court created.')
      }
      navigate('/admin/pickleball-courts')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save court.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/pickleball-courts')}>
              <ArrowLeft className="h-4 w-4" /> Back to courts
            </Button>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pickleball courts</p>
              <h1 className="font-display text-2xl font-bold leading-tight">{isEdit ? 'Edit Court' : 'Add Court'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/pickleball-courts')} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {saving || uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Save changes' : 'Create court'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            <section className="rounded-xl border bg-card/50 p-5">
              <h2 className="font-display mb-4 text-lg font-semibold border-b pb-3">Court information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Court 1" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Premium outdoor court" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Brief description…" />
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-card/50 p-5">
              <h2 className="font-display mb-4 text-lg font-semibold border-b pb-3">Pricing</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hourlyRate">Hourly rate</Label>
                  <Input id="hourlyRate" type="number" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weekdayRate">Weekday rate</Label>
                  <Input id="weekdayRate" type="number" value={form.weekdayRate} onChange={(e) => setForm((f) => ({ ...f, weekdayRate: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weekendRate">Weekend rate</Label>
                  <Input id="weekendRate" type="number" value={form.weekendRate} onChange={(e) => setForm((f) => ({ ...f, weekendRate: Number(e.target.value) }))} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-card/50 p-5">
              <h2 className="font-display mb-4 text-lg font-semibold border-b pb-3">Details & availability</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="surface">Surface</Label>
                  <Input id="surface" value={form.surface} onChange={(e) => setForm((f) => ({ ...f, surface: e.target.value }))} placeholder="Concrete / Asphalt" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxPlayers">Max players</Label>
                  <Input id="maxPlayers" type="number" value={form.maxPlayers} onChange={(e) => setForm((f) => ({ ...f, maxPlayers: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="openTime">Open time</Label>
                  <TimePicker12h value={form.openTime} onChange={(v) => setForm((f) => ({ ...f, openTime: v }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="closeTime">Close time</Label>
                  <TimePicker12h value={form.closeTime} onChange={(v) => setForm((f) => ({ ...f, closeTime: v }))} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="isCovered" type="checkbox" checked={form.isCovered} onChange={(e) => setForm((f) => ({ ...f, isCovered: e.target.checked }))} className="h-4 w-4 rounded border-input" />
                  <Label htmlFor="isCovered">Covered</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="isAvailable" type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} className="h-4 w-4 rounded border-input" />
                  <Label htmlFor="isAvailable">Available</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="isActive" type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-input" />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-card/50 p-5">
              <h2 className="font-display mb-4 text-lg font-semibold border-b pb-3">Amenities</h2>
              <div className="flex gap-2">
                <Input value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity() } }} placeholder="Add amenity and press Enter" />
                <Button type="button" onClick={addAmenity}>Add</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(form.amenities ?? []).map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                    {a}
                    <button type="button" onClick={() => removeAmenity(a)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </section>
      </div>

      <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border bg-card p-5">
              <h2 className="font-display mb-4 text-lg font-semibold border-b pb-3">Court image</h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageSelected(file)
                  e.target.value = ''
                }}
              />
              <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {imagePreview || form.imageUrl ? (
                  <img src={imagePreview || form.imageUrl} alt={form.name || 'Court preview'} className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving || uploadingImage} className="w-full">
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {imagePreview || form.imageUrl ? 'Replace image' : 'Upload image'}
                </Button>
                {(imagePreview || form.imageUrl) && (
                  <Button type="button" variant="ghost" onClick={removeImage} disabled={saving} className="w-full">
                    Remove image
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

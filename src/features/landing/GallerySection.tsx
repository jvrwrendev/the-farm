import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ImageIcon, Waves, BedDouble, UtensilsCrossed, Wifi, Car, Trees } from 'lucide-react'
import { getPolicies } from '@/services/resort.service'
import { useQuery } from '@tanstack/react-query'
import { getActiveImages } from '@/features/admin/imageStorage'
import { MOCK_GALLERY } from '@/features/landing/mockContent'
import type { GalleryItem } from '@/types'

const TILE_ASPECTS = [
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[4/3]',
  'aspect-[3/4]',
  'aspect-[5/4]',
  'aspect-square',
] as const

function tileAspectClass(index: number, isCover: boolean): string {
  if (isCover) return 'aspect-[4/3]'
  return TILE_ASPECTS[index % TILE_ASPECTS.length]
}

export function GallerySection() {
  const managedGallery: GalleryItem[] = getActiveImages('gallery').map((img, i) => ({
    id: img.id,
    image_url: img.fileUrl,
    storage_path: '',
    title: img.name,
    alt_text: img.description || img.name,
    is_cover: false,
    sort_order: 1000 + i,
    is_active: true,
    created_at: img.uploadedAt,
    updated_at: img.uploadedAt,
  }))
  // Fall back to bundled gallery images when no managed images are available
  // (e.g. on a fresh deployment or a new browser/device).
  const gallery: GalleryItem[] = (managedGallery.length > 0 ? managedGallery : MOCK_GALLERY).sort(
    (a, b) => a.sort_order - b.sort_order,
  )

  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <section id="gallery" className="scroll-mt-28 bg-muted/40 py-20 px-4 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Gallery
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            A glimpse of your perfect getaway
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Browse moments captured around The Farm — rooms, gardens, gatherings, and golden sunsets.
          </p>
          {gallery.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              Showing {gallery.length} photos
            </p>
          )}
        </motion.div>

        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            No photos yet. Add images in Admin → Image Management to populate the gallery.
          </div>
        ) : (
          <div className="columns-1 gap-x-3 [column-fill:balance] sm:columns-2 lg:columns-3 xl:columns-4">
            {gallery.map((item, i) => {
              const aspectClass = tileAspectClass(i, !!item.is_cover)
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  onClick={() => setLightbox(i)}
                  aria-label={`Open photo: ${item.alt_text || item.title}`}
                  className={`group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl bg-muted ring-1 ring-black/5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${aspectClass}`}
                >
                  <img
                    src={item.image_url}
                    alt={item.alt_text || item.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading={i < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 translate-y-2 px-3 pb-3 text-left opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-xs font-semibold text-white drop-shadow-sm">
                      {item.title || item.alt_text || `Photo ${i + 1}`}
                    </p>
                    {item.alt_text && item.title && item.alt_text !== item.title && (
                      <p className="mt-0.5 text-[10px] text-white/85">{item.alt_text}</p>
                    )}
                  </div>
                  {item.is_cover && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Featured
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(null)
              }}
              aria-label="Close"
              className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox((lightbox - 1 + gallery.length) % gallery.length)
              }}
              aria-label="Previous photo"
              className="absolute left-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <motion.img
              key={lightbox}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              src={gallery[lightbox]?.image_url}
              alt={gallery[lightbox]?.title}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox((lightbox + 1) % gallery.length)
              }}
              aria-label="Next photo"
              className="absolute right-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {lightbox + 1} / {gallery.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

interface AmenityCard {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const CURATED_AMENITIES: AmenityCard[] = [
  {
    id: 'pool',
    name: 'Swimming Pool',
    description: 'A private pool reserved for your group, ideal for unhurried afternoons under the sun.',
    icon: Waves,
  },
  {
    id: 'rooms',
    name: 'Comfortable Rooms',
    description: 'Spacious, well-appointed rooms with fresh linens and restful beds for a peaceful stay.',
    icon: BedDouble,
  },
  {
    id: 'restaurant',
    name: 'Dining Area',
    description: 'An open-air space for shared meals and intimate celebrations, enjoyed at your own pace.',
    icon: UtensilsCrossed,
  },
  {
    id: 'wifi',
    name: 'Wi-Fi',
    description: 'Complimentary internet access throughout the property, whenever you need to connect.',
    icon: Wifi,
  },
  {
    id: 'parking',
    name: 'Parking',
    description: 'Secure on-site parking for your group, with space for multiple vehicles.',
    icon: Car,
  },
  {
    id: 'nature',
    name: 'Gardens & Outdoors',
    description: 'Lush greenery, quiet corners, and open grounds that invite you to slow down and unwind.',
    icon: Trees,
  },
]

export function AmenitiesSection() {
  return (
    <section id="amenities" className="scroll-mt-28 bg-background px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              The Farm Resort
            </p>
            <h2 className="font-display mt-4 text-3xl font-semibold leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
              Your Private Escape, Your Own Paradise
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Reserved exclusively for one group at a time, The Farm offers a calm, refined setting
              where every space is yours to enjoy. Thoughtful comforts, open surroundings, and
              unhurried privacy come together for a stay that feels personal and effortless.
            </p>
            <div className="mt-8 h-px w-16 bg-primary/30" aria-hidden="true" />
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              From quiet mornings in the garden to relaxed gatherings by the pool, each amenity is
              designed to complement the resort&apos;s private, welcoming atmosphere.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="lg:col-span-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-border/70 pb-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                Resort Amenities
              </h3>
              <span className="text-xs text-muted-foreground">Exclusively yours during your stay</span>
            </div>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {CURATED_AMENITIES.map((amenity, i) => {
                const Icon = amenity.icon
                return (
                  <motion.li
                    key={amenity.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    className="group flex items-start gap-4"
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/[0.04] text-primary">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-foreground">{amenity.name}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {amenity.description}
                      </p>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export function PoliciesSection() {
  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: getPolicies,
  })

  return (
    <section id="policies" className="scroll-mt-28 py-20 px-4 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Resort Policies</h2>
          <p className="mt-4 text-muted-foreground">Please review before booking</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {policies.map((policy, i) => (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border bg-card p-5"
            >
              <h3 className="font-semibold">{policy.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{policy.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

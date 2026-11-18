import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  PhilippinePeso,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Car,
  Droplets,
  Lightbulb,
  Armchair,
  Target,
  Bath,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PickleballGallery } from './PickleballGallery'
import { PICKLEBALL_FACILITIES, PICKLEBALL_SETTINGS } from './mockData'
import { formatCurrency } from '@/lib/utils'
import heroBg from '@/assets/images/pickleball.jpg'
import { listPickleballCourts } from '@/services/pickleballCourt.service'
import { getPickleballSettings } from '@/services/pickleballSettings.service'
import { formatTimeLabel } from './utils'

const FACILITY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  court: CalendarCheck2,
  light: Lightbulb,
  seating: Armchair,
  paddle: Target,
  water: Droplets,
  parking: Car,
  restroom: Bath,
  'first-aid': ShieldCheck,
}

const PLAYING_NOTES = [
  'Each court is sized for doubles, with a maximum of four players per reservation.',
  'Bookings are made in one-hour slots, with a maximum of three hours per reservation.',
  'Arrive 10–15 minutes early so you can warm up and settle in before your slot.',
  'Wear non-marking court shoes. Paddles and balls can be rented at the court desk.',
  'Evening sessions are floodlit, so the last slot starts at 8:00 PM.',
]

export default function PickleballPage() {
  const { data: courts = [] } = useQuery({
    queryKey: ['pickleball-courts'],
    queryFn: listPickleballCourts,
  })
  const { data: facilitySettings } = useQuery({
    queryKey: ['pickleball-settings'],
    queryFn: getPickleballSettings,
  })

  const derivedLowestRate = courts.length ? Math.min(...courts.map((court) => court.hourlyRate)) : 0
  const openTime = facilitySettings?.openTime || PICKLEBALL_SETTINGS.openTime
  const closeTime = facilitySettings?.closeTime || PICKLEBALL_SETTINGS.closeTime
  const courtsCount = (facilitySettings?.courtsCount ?? 0) > 0 ? (facilitySettings?.courtsCount ?? courts.length) : (courts.length || 0)
  const maxPlayersPerCourt = facilitySettings?.maxPlayersPerCourt || PICKLEBALL_SETTINGS.maxPlayers
  const startingHourlyRate = (facilitySettings?.startingHourlyRate ?? 0) > 0
    ? (facilitySettings?.startingHourlyRate ?? derivedLowestRate)
    : (derivedLowestRate || 0)

  const hoursLabel = `${formatTimeLabel(openTime)} – ${formatTimeLabel(closeTime)}`
  const hoursLabelShort = hoursLabel.replace(/:00 /g, ' ').replace(/ AM/g, ' AM').replace(/ PM/g, ' PM')
  const courtsCountLabel = `${courtsCount} court${courtsCount === 1 ? '' : 's'}`
  const maxPlayersLabel = `Up to ${maxPlayersPerCourt} per court`
  const courtCapacityLabel = `${maxPlayersPerCourt} players / court`

  return (
    <PublicLayout>
      <section
        className="relative isolate w-full overflow-hidden scroll-mt-24"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        width: '100vw',        minHeight: '100vh',
        }}
        aria-label="Pickleball at The Farm"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/75" />
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-4 pb-20 pt-36 sm:px-6 sm:pt-44 lg:min-h-[700px] lg:pb-28">
          <div className="max-w-3xl text-white">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              New at The Farm
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              Rally, relax, repeat.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg"
            >
              {courtsCount} pickleball court{courtsCount === 1 ? '' : 's'}, fresh farm air, and a schedule that fits your stay. Gather
              your group, pick a slot, and make the court yours for the hour.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 flex flex-wrap gap-2 text-xs font-medium text-white/90"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Clock className="h-3.5 w-3.5" /> {hoursLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Trophy className="h-3.5 w-3.5" /> {courtsCountLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Users className="h-3.5 w-3.5" /> {maxPlayersLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <PhilippinePeso className="h-3.5 w-3.5" /> From {formatCurrency(startingHourlyRate)} / hour
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button size="lg" asChild className="rounded-full px-7">
                <Link to="/pickleball/book">
                  <CalendarCheck2 className="h-4 w-4" />
                  Book a Court
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-full border-white/40 bg-white/10 px-7 text-white backdrop-blur hover:bg-white/20 hover:text-white"
              >
                <a href="#pickleball-gallery">
                  View the gallery
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: Clock, label: 'Open daily', value: hoursLabelShort },
            { icon: Trophy, label: 'Playing courts', value: courtsCountLabel },
            { icon: Users, label: 'Court capacity', value: courtCapacityLabel },
            { icon: PhilippinePeso, label: 'Hourly rate', value: `From ${formatCurrency(startingHourlyRate)}` },
          ].map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      <PickleballGallery />

      <section id="courts" className="scroll-mt-24 bg-background px-4 py-20 sm:px-6 lg:py-24">
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
              Choose Your Court
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              {courtsCount} ways to play
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Pick the court that suits your group. Every court includes lighting, seating, and
              access to the resort’s facilities.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts.map((court, index) => (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07, duration: 0.5 }}
              >
                <Card className="flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {court.imageUrl ? (
                      <Link
                        to="/#pickleball"
                        aria-label="View Pickleball on the landing page"
                        className="block h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <img
                          src={court.imageUrl}
                          alt={`${court.name} at The Farm`}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                      </Link>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <span className="text-sm">No image</span>
                      </div>
                    )}
                    <Badge className="absolute left-3 top-3" variant={court.isCovered ? 'success' : 'secondary'}>
                      {court.isCovered ? 'Covered' : 'Outdoor'}
                    </Badge>
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="font-display text-xl">{court.name}</CardTitle>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-primary">
                          {court.tagline}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold text-foreground">
                          {formatCurrency(court.hourlyRate)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">per hour</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <p className="text-sm text-muted-foreground">{court.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                        <MapPin className="h-3 w-3 text-primary" /> {court.surface}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                        <Users className="h-3 w-3 text-primary" /> Up to {court.maxPlayers} players
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                        <Clock className="h-3 w-3 text-primary" /> {formatTimeLabel(court.openTime)}–{formatTimeLabel(court.closeTime)}
                      </span>
                    </div>
                    <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      {court.amenities.slice(0, 4).map((amenity) => (
                        <li key={amenity} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{amenity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5">
                      <Button asChild className="w-full rounded-full">
                        <Link to={`/pickleball/book?court=${court.id}`}>Book {court.name}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="facilities" className="scroll-mt-24 bg-secondary/40 px-4 py-20 sm:px-6 lg:py-24">
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
              Facilities & Amenities
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              Everything you need courtside
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Designed for relaxed play and easy hosting, with comfort and convenience close at hand.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PICKLEBALL_FACILITIES.map((facility, index) => {
              const Icon = FACILITY_ICONS[facility.icon] ?? Sparkles
              return (
                <motion.div
                  key={facility.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04, duration: 0.45 }}
                  className="rounded-2xl border bg-card p-5"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{facility.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{facility.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-background px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Before You Play
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Good to know
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              A few quick notes to help you make the most of your court time.
            </p>
            <ul className="mt-6 space-y-3">
              {PLAYING_NOTES.map((note) => (
                <li key={note} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Rates and availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operating hours</p>
                    <p className="mt-1 font-display text-lg font-semibold">{hoursLabel}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Open daily, last slot at {formatTimeLabel(closeTime)}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hourly rate</p>
                    <p className="mt-1 font-display text-lg font-semibold">From {formatCurrency(startingHourlyRate)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Per court, per hour</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booking window</p>
                    <p className="mt-1 font-display text-lg font-semibold">Up to {PICKLEBALL_SETTINGS.maxDurationHours} hours</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Per reservation</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capacity</p>
                    <p className="mt-1 font-display text-lg font-semibold">Up to {maxPlayersPerCourt} players</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Per court</p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Reserve your court
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Pick a court, date, and time. We’ll hold the slot as pending until our team confirms it.
                  </p>
                  <Button asChild className="mt-4 w-full rounded-full sm:w-auto">
                    <Link to="/pickleball/book">
                      <CalendarCheck2 className="h-4 w-4" />
                      Book a Court
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  )
}

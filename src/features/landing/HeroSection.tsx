import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Bed, Tag, CalendarCheck2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HERO_BACKGROUND_URL } from '@/features/landing/mockContent'
import { getAccommodation } from '@/services/accommodation.service'
import { queryKeys } from '@/lib/queryKeys'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

const HERO_INFO_CARDS: Array<{ icon: LucideIcon; title: string; subtitle: string }> = [
  {
    icon: Bed,
    title: 'Exclusive Accommodation',
    subtitle: 'The whole resort, one group',
  },
  {
    icon: Tag,
    title: '₱6,500 / night',
    subtitle: 'Transparent, flat rate',
  },
  {
    icon: CalendarCheck2,
    title: 'Easy Booking',
    subtitle: 'Reserve online in minutes',
  },
]

function HeroInfoCard({
  icon: Icon,
  title,
  subtitle,
  delay = 0,
  className,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay }}
      className={cn(
        'glass-dark flex items-center gap-2.5 rounded-xl px-3 py-2.5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3',
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-primary sm:h-9 sm:w-9">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 text-white">
        <p className="text-[13px] font-semibold leading-tight sm:text-sm">{title}</p>
        <p className="text-[11px] leading-snug text-white/75 sm:text-xs">{subtitle}</p>
      </div>
    </motion.div>
  )
}

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative isolate w-full overflow-hidden scroll-mt-28"
      aria-label={`${BRAND_NAME} hero`}
    >
      <img
        src={HERO_BACKGROUND_URL}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Subtle dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/45 lg:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.35),rgba(0,0,0,0.7))]" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 pb-10 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:pb-24 lg:pt-36">
        <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left column: copy + CTAs */}
          <div className="min-w-0 text-white lg:col-span-7">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Welcome to {BRAND_NAME}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display mt-4 max-w-[14ch] text-[2rem] font-bold leading-[1.1] break-words sm:mt-5 sm:max-w-none sm:text-5xl lg:text-6xl"
            >
              The entire resort, exclusively yours
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85 sm:mt-5 sm:text-lg"
            >
              One exclusive accommodation, one group at a time. Check availability and reserve your
              private escape online.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 flex w-full items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur sm:mt-6 sm:inline-flex sm:w-auto sm:justify-start sm:gap-x-3 sm:gap-y-1 sm:rounded-2xl sm:px-5"
            >
              <span className="text-sm font-medium text-white/90 sm:text-white/85">
                Exclusive Accommodation
              </span>
              <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
                <span className="font-display text-xl font-bold text-white sm:text-2xl">₱6,500</span>
                <span className="text-xs text-white/75 sm:text-sm">/ night</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center"
            >
              <Button
                size="lg"
                asChild
                className="h-12 w-full justify-center rounded-[5px] px-6 text-base sm:h-11 sm:w-auto sm:px-7 sm:text-sm"
              >
                <Link to="/book">
                  <Calendar className="h-4 w-4" />
                  Book Your Stay
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 w-full justify-center rounded-[5px] border-white/40 bg-white/10 px-6 text-base text-white backdrop-blur hover:bg-white/20 hover:text-white sm:h-11 sm:w-auto sm:px-7 sm:text-sm"
              >
                <a href="#rooms">View Accommodation</a>
              </Button>
            </motion.div>
          </div>

          {/* Right column: floating info cards */}
          <div className="hidden lg:col-span-5 lg:flex lg:flex-col lg:items-end lg:gap-4">
            {HERO_INFO_CARDS.map((card, index) => (
              <HeroInfoCard key={card.title} {...card} delay={0.3 + index * 0.1} />
            ))}
          </div>

          {/* Mobile info cards (horizontal scroll) */}
          <div className="-mx-4 flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-4 px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:hidden">
            {HERO_INFO_CARDS.map((card, index) => (
              <HeroInfoCard
                key={card.title}
                {...card}
                delay={0.3 + index * 0.1}
                className="w-[15rem] shrink-0 snap-start"
              />
            ))}
          </div>

          {/* Tablet info cards (vertical) */}
          <div className="hidden flex-col gap-2.5 sm:flex lg:hidden">
            {HERO_INFO_CARDS.map((card, index) => (
              <HeroInfoCard key={card.title} {...card} delay={0.3 + index * 0.1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function AboutSection() {
  const { data: accommodation } = useQuery({
    queryKey: queryKeys.accommodation,
    queryFn: getAccommodation,
  })
  const highlights = [
    {
      title: 'A relaxing, premium atmosphere',
      body: 'Wide-open spaces, gentle breeze, and clean air — The Farm is built for slow mornings and easy evenings.',
    },
    {
      title: 'Surrounded by nature',
      body: 'Lush gardens, tropical greenery, and a quiet neighborhood that lets you fully disconnect from the city.',
    },
    {
      title: 'Made for memorable stays',
      body: 'Whether it is a family reunion, a team retreat, or a private celebration, our team helps make every moment effortless.',
    },
  ]

  return (
    <section id="about" className="scroll-mt-28 bg-background py-20 px-4 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted sm:aspect-[5/4] lg:aspect-[4/5]"
        >
          <img
            src={accommodation?.image_url || HERO_BACKGROUND_URL}
            alt="The Farm resort exterior"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            About The Farm
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            A private farm resort, made for gathering.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Tucked away in a quiet, scenic part of Antipolo, The Farm is a private
            resort where families, friends, and teams come together to slow down.
            Spacious villas, lush gardens, and warm hospitality — every stay is
            reserved for one group at a time, so the entire property is yours.
          </p>

          <ul className="mt-8 space-y-5">
            {highlights.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground sm:text-base">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}

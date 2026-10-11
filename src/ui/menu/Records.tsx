import { useState } from 'react'
import { LEVELS, MAX_LEVEL } from '../../levels/levels'
import { useProgressStore } from '../../state/progressStore'
import { useRecordsStore, type LifetimeCounters } from '../../state/recordsStore'
import { computeAchievements, type Achievement } from '../../state/achievements'
import { totalStars } from '../../state/starTotals'
import { CheckIcon, LockIcon, ShieldIcon, StarGlyph } from '../icons'
import { Segmented, StarRow } from '../primitives'
import { displayText, formatDuration, formatScore } from '../levelFormat'
import { SHIPS, isShipUnlocked, nextShipToUnlock } from '../shipAdapter'
import { shipThrustFrameSrc } from '../../render/shipSkins'
import { Sheet } from './Sheet'

type RecordsTab = 'overview' | 'levels' | 'awards'

const TABS: readonly { value: RecordsTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'levels', label: 'Levels' },
  { value: 'awards', label: 'Awards' },
]

const COUNTER_ROWS: readonly { key: keyof LifetimeCounters; label: string }[] = [
  { key: 'levelsCleared', label: 'Clears' },
  { key: 'asteroidsDestroyed', label: 'Destroyed' },
  { key: 'pickupsCollected', label: 'Pickups' },
  { key: 'nearMisses', label: 'Near misses' },
  { key: 'slingshots', label: 'Slingshots' },
  { key: 'shipsLost', label: 'Ships lost' },
]

interface RecordsProps {
  onBack: () => void
}

export function Records({ onBack }: RecordsProps) {
  const [tab, setTab] = useState<RecordsTab>('overview')
  const best = useProgressStore((s) => s.best)
  const records = useRecordsStore()
  const achievements = computeAchievements({ best, records, maxLevel: MAX_LEVEL })

  return (
    <Sheet
      title="Records"
      onBack={onBack}
      aside={<Segmented label="Records view" value={tab} options={TABS} onChange={setTab} />}
    >
      <div key={tab} className="es-records es-enter">
        {tab === 'overview' && <Overview achievements={achievements} />}
        {tab === 'levels' && <LevelTable />}
        {tab === 'awards' && <AwardList achievements={achievements} />}
      </div>
    </Sheet>
  )
}

function Overview({ achievements }: { achievements: readonly Achievement[] }) {
  const best = useProgressStore((s) => s.best)
  const records = useRecordsStore()
  const stars = totalStars(best)
  const maxStars = MAX_LEVEL * 3
  const earned = achievements.filter((a) => a.earned).length
  const ships = SHIPS.filter((s) => isShipUnlocked(s, stars)).length

  return (
    <div className="es-records__overview">
      <div className="es-records__hero es-panel">
        <span className="es-label">Stars collected</span>
        <span className="es-records__big">
          <StarGlyph />
          {stars}
          <span className="es-records__of">/ {maxStars}</span>
        </span>
        <Meter value={stars} max={maxStars} />
        <div className="es-records__mini">
          <MiniStat value={`${Object.keys(best).length}/${MAX_LEVEL}`} label="Levels" />
          <MiniStat value={`${ships}/${SHIPS.length}`} label="Ships" />
          <MiniStat value={`${earned}/${achievements.length}`} label="Awards" />
        </div>
      </div>
      <div className="es-records__counters">
        {COUNTER_ROWS.map((row) => (
          <div key={row.key} className="es-records__counter">
            <span className="es-records__count">{formatScore(records[row.key])}</span>
            <span className="es-label">{row.label}</span>
          </div>
        ))}
      </div>
      <NextUnlock stars={stars} />
    </div>
  )
}

function NextUnlock({ stars }: { stars: number }) {
  const next = nextShipToUnlock(stars)
  if (!next) {
    return (
      <div className="es-records__next">
        <span className="es-label">Hangar</span>
        <span className="es-records__nexttext">Every ship unlocked</span>
      </div>
    )
  }
  const needed = next.unlockStars - stars
  return (
    <div className="es-records__next">
      <span className="es-label">Next ship</span>
      <img className="es-records__nextship" src={shipThrustFrameSrc(next.prefix, 'full', 0)} alt="" draggable={false} />
      <span className="es-records__nexttext">{next.label}</span>
      <span className="es-records__nextneed">
        <StarGlyph />
        {needed} more {needed === 1 ? 'star' : 'stars'}
      </span>
      <Meter value={stars} max={next.unlockStars} />
    </div>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="es-records__ministat">
      <span className="es-records__minivalue">{value}</span>
      <span className="es-label">{label}</span>
    </div>
  )
}

function Meter({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <span className="es-meter" role="presentation">
      <span className="es-meter__fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

function LevelTable() {
  const best = useProgressStore((s) => s.best)
  const highestUnlocked = useProgressStore((s) => s.highestUnlocked)
  const fastestMs = useRecordsStore((s) => s.fastestMs)
  const flawless = useRecordsStore((s) => s.flawlessLevels)

  return (
    <ol className="es-records__levels">
      {LEVELS.map((level) => {
        const record = best[String(level.id)]
        const locked = level.id > highestUnlocked
        const fastest = fastestMs[String(level.id)]
        return (
          <li key={level.id} className={`es-records__level${locked ? ' es-records__level--locked' : ''}`}>
            <span className="es-records__num">{String(level.id).padStart(2, '0')}</span>
            <span className="es-records__name">{displayText(level.name)}</span>
            <span className="es-records__flawless" title="Cleared without losing a ship">
              {flawless.includes(level.id) && <ShieldIcon />}
            </span>
            {locked ? (
              <span className="es-records__locked">
                <LockIcon />
              </span>
            ) : (
              <>
                <StarRow stars={record?.stars ?? 0} size={10} />
                <span className="es-records__score">{record ? formatScore(record.score) : '0'}</span>
                <span className="es-records__time">{fastest ? formatDuration(fastest) : '-:--'}</span>
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function AwardList({ achievements }: { achievements: readonly Achievement[] }) {
  return (
    <ul className="es-awards">
      {achievements.map((a) => (
        <li key={a.id} className={`es-award${a.earned ? ' es-award--earned' : ''}`}>
          <span className="es-award__badge" aria-hidden="true">
            {a.earned ? <CheckIcon /> : <LockIcon />}
          </span>
          <span className="es-award__text">
            <span className="es-award__title">{a.title}</span>
            <span className="es-award__desc">{a.description}</span>
          </span>
          <span className="es-award__progress">
            {a.earned ? 'Earned' : `${formatScore(a.value)}/${formatScore(a.target)}`}
          </span>
        </li>
      ))}
    </ul>
  )
}

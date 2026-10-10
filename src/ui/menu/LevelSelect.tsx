import { LEVELS } from '../../levels/levels'
import { useProgressStore } from '../../state/progressStore'
import { displayText, formatScore } from '../levelFormat'
import { StarRow } from '../primitives'
import { Sheet } from './Sheet'

interface LevelSelectProps {
  onBack: () => void
  onSelect: (level: number) => void
}

export function LevelSelect({ onBack, onSelect }: LevelSelectProps) {
  const highestUnlocked = useProgressStore((s) => s.highestUnlocked)
  const best = useProgressStore((s) => s.best)
  const totalStars = Object.values(best).reduce((sum, b) => sum + b.stars, 0)

  return (
    <Sheet
      title="Select level"
      onBack={onBack}
      aside={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <StarRow stars={1} size={11} />
          {totalStars} / {LEVELS.length * 3}
        </span>
      }
    >
      <div className="es-levels">
        {LEVELS.map((level) => {
          const locked = level.id > highestUnlocked
          const record = best[String(level.id)]
          const current = level.id === highestUnlocked && !record
          return (
            <button
              key={level.id}
              type="button"
              className={`es-level${current ? ' es-level--current' : ''}`}
              disabled={locked}
              onClick={() => onSelect(level.id)}
              aria-label={`Level ${level.id}, ${displayText(level.name)}${locked ? ', locked' : ''}`}
            >
              <span className="es-level__num">LEVEL {level.id}</span>
              <span className="es-level__name">{displayText(level.name)}</span>
              <span className="es-level__sub">{displayText(level.subtitle)}</span>
              <span className="es-level__foot">
                <StarRow stars={record?.stars ?? 0} size={12} />
                {record && record.score > 0 && <span>{formatScore(record.score)}</span>}
                {current && <span style={{ color: 'var(--es-accent)' }}>NEXT</span>}
              </span>
              {locked && <LockIcon />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

function LockIcon() {
  return (
    <svg className="es-level__lock" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

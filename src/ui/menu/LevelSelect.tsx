import { LEVELS } from '../../levels/levels'
import { useProgressStore } from '../../state/progressStore'
import { displayText, formatScore } from '../levelFormat'
import { StarRow } from '../primitives'
import { Sheet } from './Sheet'
import { StarTotal } from './StarTotal'
import { LockIcon } from '../icons'

interface LevelSelectProps {
  onBack: () => void
  onSelect: (level: number) => void
}

export function LevelSelect({ onBack, onSelect }: LevelSelectProps) {
  const highestUnlocked = useProgressStore((s) => s.highestUnlocked)
  const best = useProgressStore((s) => s.best)

  return (
    <Sheet
      title="Select level"
      onBack={onBack}
      aside={<StarTotal />}
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
                {current && <span className="es-level__next">Next</span>}
              </span>
              {locked && <LockIcon className="es-level__lock" />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

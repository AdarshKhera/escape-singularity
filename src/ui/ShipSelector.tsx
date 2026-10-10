import { SHIP_SKINS, getShipSkin, shipThrustFrameSrc } from '../render/shipSkins'

interface ShipSelectorProps {
  selectedId: string
  onSelect: (id: string) => void
}

// Large preview of the chosen craft beside a thumb-sized grid of every ship,
// so picking one is a single tap rather than paging with arrows.
export function ShipSelector({ selectedId, onSelect }: ShipSelectorProps) {
  const skin = getShipSkin(selectedId)

  return (
    <div className="es-hangar">
      <div className="es-hangar__stage">
        <img
          key={skin.id}
          className="es-hangar__preview"
          src={shipThrustFrameSrc(skin.prefix, 'full', 1)}
          alt={skin.label}
          draggable={false}
        />
        <div className="es-hangar__name">{skin.label}</div>
        <div className="es-label">{skin.detail.replace(/\s*·\s*/g, ' / ')}</div>
      </div>

      <div className="es-hangar__grid" role="radiogroup" aria-label="Ship">
        {SHIP_SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === skin.id}
            aria-label={s.label}
            className="es-hangar__thumb"
            onClick={() => onSelect(s.id)}
          >
            <img src={shipThrustFrameSrc(s.prefix, 'full', 0)} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </div>
  )
}

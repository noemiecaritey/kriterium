import { useEffect, useState } from 'react'
import { useItem } from '../data/store'
import type { CardT } from '../data/types'
import { useReward } from '../lib/actions'
import { nav } from '../lib/router'

/** Face "œuvre" d'une carte (utilisée dans la galerie et dans l'écran de récompense). */
export function ArtFace({ card }: { card: CardT }) {
  return (
    <div className="art">
      {card.image ? <img src={card.image} alt={card.title ?? 'Œuvre'} loading="lazy" /> : <div className="art-pending" />}
      <div className="art-cap">
        <strong>{card.title}</strong>
        <span>
          {card.artist}
          {card.year ? ` · ${card.year}` : ''}
        </span>
      </div>
    </div>
  )
}

/** Écran affiché quand une tâche est terminée : la carte se retourne et révèle l'œuvre gagnée. */
export function RewardModal() {
  const { cardId, dismiss } = useReward()
  const card = useItem<CardT>(cardId ?? undefined)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    setSlow(false)
    if (!cardId) return
    const t = window.setTimeout(() => setSlow(true), 7000)
    return () => window.clearTimeout(t)
  }, [cardId])

  if (!cardId) return null
  const ready = card?.status === 'ready'

  return (
    <div className="reward-ov" role="dialog" aria-modal="true" aria-label="Œuvre gagnée">
      <p className="reward-kicker">Tâche terminée</p>
      <div className={'reward-card' + (ready ? ' flipped' : '')}>
        <div className="rc-inner">
          <div className="rc-front">
            <span>{slow ? 'Pas de connexion…' : 'Une œuvre arrive…'}</span>
          </div>
          <div className="rc-back">{card && ready && <ArtFace card={card} />}</div>
        </div>
      </div>
      {slow && !ready && <p className="muted center">Ta carte t'attend dans la galerie, elle se révélera dès que tu seras en ligne.</p>}
      {ready && card && <p className="muted center">« {card.taskTitle} » t'a rapporté cette œuvre.</p>}
      <div className="reward-actions">
        <button className="btn ghost" onClick={dismiss}>
          Continuer
        </button>
        <button
          className="btn"
          onClick={() => {
            dismiss()
            nav('/galerie')
          }}
        >
          Voir la galerie
        </button>
      </div>
    </div>
  )
}

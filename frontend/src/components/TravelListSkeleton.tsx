import { useTranslation } from 'react-i18next'
import './skeleton.css'
import './TravelListSkeleton.css'

const ROW_KEYS = ['a', 'b', 'c', 'd', 'e'] as const

export function TravelListSkeleton() {
  const { t } = useTranslation()
  return (
    <ul className="travel-list-skel" aria-busy="true" aria-label={t('common.loadingTravelList')}>
      {ROW_KEYS.map((k) => (
        <li key={k} className="travel-list-skel__row">
          <span className="travel-list-skel__name gf-skel" />
          <span className="travel-list-skel__chip gf-skel" />
        </li>
      ))}
    </ul>
  )
}

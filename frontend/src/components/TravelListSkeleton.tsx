import './skeleton.css'
import './TravelListSkeleton.css'

const ROW_KEYS = ['a', 'b', 'c', 'd', 'e'] as const

export function TravelListSkeleton() {
  return (
    <ul className="travel-list-skel" aria-busy="true" aria-label="Geziler yükleniyor">
      {ROW_KEYS.map((k) => (
        <li key={k} className="travel-list-skel__row">
          <span className="travel-list-skel__name gf-skel" />
          <span className="travel-list-skel__chip gf-skel" />
        </li>
      ))}
    </ul>
  )
}

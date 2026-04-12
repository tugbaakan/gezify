import { useTranslation } from 'react-i18next'
import './skeleton.css'
import './TravelDetailSkeleton.css'

export function TravelDetailSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="travel-detail-skel" aria-busy="true" aria-label={t('common.loadingTravelDetail')}>
      <div className="travel-detail-skel__crumb gf-skel" />
      <div className="travel-detail-skel__sticky">
        <div className="travel-detail-skel__title gf-skel" />
        <div className="travel-detail-skel__actions">
          <span className="travel-detail-skel__btn gf-skel" />
          <span className="travel-detail-skel__btn gf-skel" />
          <span className="travel-detail-skel__btn gf-skel" />
        </div>
      </div>
      <div className="travel-detail-skel__section">
        <div className="travel-detail-skel__h2 gf-skel" />
        <div className="travel-detail-skel__exp-toolbar">
          <span className="travel-detail-skel__select gf-skel" />
          <span className="travel-detail-skel__select gf-skel" />
        </div>
        <div className="travel-detail-skel__day gf-skel" />
        <ul className="travel-detail-skel__exp-list">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="travel-detail-skel__exp-row">
              <span className="travel-detail-skel__exp-main gf-skel" />
              <span className="travel-detail-skel__exp-amt gf-skel" />
              <span className="travel-detail-skel__exp-meta gf-skel" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

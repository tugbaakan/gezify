import './skeleton.css'
import './SettlementSkeleton.css'

export function SettlementSkeleton() {
  return (
    <div className="settlement-skel" aria-busy="true" aria-label="Ödeme özeti yükleniyor">
      <div className="settlement-skel__crumb gf-skel" />
      <div className="settlement-skel__head-title gf-skel" />
      <div className="settlement-skel__head-sub gf-skel" />
      <div className="settlement-skel__flow">
        <span className="settlement-skel__pill gf-skel" />
        <span className="settlement-skel__pill gf-skel" />
        <span className="settlement-skel__pill gf-skel" />
      </div>
      <div className="settlement-skel__card">
        <div className="settlement-skel__h2 gf-skel" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="settlement-skel__transfer">
            <span className="settlement-skel__line gf-skel" />
            <span className="settlement-skel__amt gf-skel" />
          </div>
        ))}
      </div>
    </div>
  )
}

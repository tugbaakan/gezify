import { useTranslation } from 'react-i18next'
import './skeleton.css'
import './ExpenseFormSkeleton.css'

export function ExpenseFormSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="expense-form-skel" aria-busy="true" aria-label={t('common.loadingForm')}>
      <div className="expense-form-skel__title gf-skel" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="expense-form-skel__field">
          <span className="expense-form-skel__label gf-skel" />
          <span className="expense-form-skel__input gf-skel" />
        </div>
      ))}
      <div className="expense-form-skel__actions">
        <span className="expense-form-skel__btn gf-skel" />
        <span className="expense-form-skel__btn expense-form-skel__btn--primary gf-skel" />
      </div>
    </div>
  )
}

import type { RedFlagResult } from '@gpnow/types';
import { useI18n } from '../i18n';

interface EmergencyModalProps {
  result: RedFlagResult;
  onClose: () => void;
}

export function EmergencyModal({ result, onClose }: EmergencyModalProps) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="emergency-modal" role="alertdialog" aria-modal="true" aria-labelledby="emergency-title">
        <div className="alert-mark">!</div>
        <span className="eyebrow">{t('emergency.eyebrow')}</span>
        <h2 id="emergency-title">{t('emergency.title')}</h2>
        <p>{t('emergency.body')}</p>
        {result.matchedGuideline && (
          <p className="guideline">{t('emergency.signal', { guideline: result.matchedGuideline })}</p>
        )}
        <a className="call-button" href="tel:999">
          {t('emergency.call')}
        </a>
        <button className="text-button" type="button" onClick={onClose}>
          {t('emergency.understand')}
        </button>
      </section>
    </div>
  );
}

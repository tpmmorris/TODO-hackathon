import type { FHIRSlot } from '@gpnow/types';
import { useI18n } from '../i18n';
import type { Language } from '../i18n/translations';

interface SlotListProps {
  slots: FHIRSlot[];
  registeredOdsCode?: string;
  onBook: (slot: FHIRSlot) => void;
}

const localeMap: Record<Language, string> = {
  en: 'en-GB',
  cy: 'cy-GB',
  pl: 'pl-PL'
};

export function SlotList({ slots, registeredOdsCode, onBook }: SlotListProps) {
  const { t, lang } = useI18n();

  // Walk-in and urgent care are always shown. GP slots only appear when they are
  // the patient's registered practice or the practice accepts out-of-area patients.
  const visibleSlots = slots.filter((slot) => {
    if (!slot.requiresRegistration) return true;
    return slot.odsCode === registeredOdsCode || slot.acceptsOutOfArea;
  });

  function formatSlot(startTime: string) {
    return new Intl.DateTimeFormat(localeMap[lang], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(startTime));
  }

  function locationTypeLabel(type: FHIRSlot['locationType']): string {
    switch (type) {
      case 'WALK_IN':
        return t('slots.walkIn');
      case 'URGENT_CARE':
        return t('slots.urgentCare');
      default:
        return t('slots.gpSurgery');
    }
  }

  return (
    <section className="slots-panel" aria-labelledby="slots-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('slots.eyebrow')}</span>
          <h2 id="slots-title">{t('slots.title')}</h2>
        </div>
        <span className="slot-count">{t('slots.open', { n: visibleSlots.length })}</span>
      </div>
      <div className="slot-list">
        {visibleSlots.length === 0 ? (
          <p className="empty-state">{t('slots.empty')}</p>
        ) : (
          visibleSlots.map((slot) => {
            const isRegistered = slot.odsCode === registeredOdsCode;
            const canBook = !slot.requiresRegistration || isRegistered || slot.acceptsOutOfArea;
            const buttonLabel = canBook ? t('slots.hold') : t('slots.registerFirst');

            return (
              <article className="slot-card" key={slot.id}>
                <div className="slot-meta">
                  <div className="slot-time">
                    <span>{formatSlot(slot.startTime)}</span>
                    <small>{slot.practitionerRole}</small>
                  </div>
                  <span className={`location-pill ${slot.locationType.toLowerCase()}`}>
                    {locationTypeLabel(slot.locationType)}
                  </span>
                </div>
                <div className="slot-location">
                  <strong>{slot.locationName}</strong>
                  <span>{slot.locationAddress}</span>
                  {slot.locationPostcode && <small>{slot.locationPostcode}</small>}
                  {slot.phone && <small className="phone">{slot.phone}</small>}
                </div>
                {slot.requiresRegistration && !isRegistered && (
                  <p className="registration-note">
                    {slot.acceptsOutOfArea ? t('slots.outOfArea') : t('slots.mustRegister')}
                  </p>
                )}
                <div className="slot-actions">
                  <span className="slot-status">{slot.status === 'FREE' ? t('slots.available') : slot.status}</span>
                  <button type="button" onClick={() => onBook(slot)} disabled={slot.status !== 'FREE' || !canBook}>
                    {buttonLabel}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

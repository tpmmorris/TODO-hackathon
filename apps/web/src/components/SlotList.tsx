import type { FHIRSlot } from '@gpnow/types';

interface SlotListProps {
  slots: FHIRSlot[];
  registeredOdsCode?: string;
  onBook: (slot: FHIRSlot) => void;
}

function formatSlot(startTime: string) {
  return new Intl.DateTimeFormat('en-GB', {
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
      return 'Walk-in centre';
    case 'URGENT_CARE':
      return 'Urgent care';
    default:
      return 'GP surgery';
  }
}

export function SlotList({ slots, registeredOdsCode, onBook }: SlotListProps) {
  return (
    <section className="slots-panel" aria-labelledby="slots-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Live availability</span>
          <h2 id="slots-title">The next best appointments</h2>
        </div>
        <span className="slot-count">{slots.length} open</span>
      </div>
      <div className="slot-list">
        {slots.length === 0 ? (
          <p className="empty-state">Run a triage to surface suitable appointments.</p>
        ) : (
          slots.map((slot) => {
            const isRegistered = slot.odsCode === registeredOdsCode;
            const canBook = !slot.requiresRegistration || isRegistered || slot.acceptsOutOfArea;
            const buttonLabel = canBook ? 'Hold slot' : 'Register first';

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
                    {slot.acceptsOutOfArea
                      ? 'Accepts out-of-area patients. Home visits may be limited.'
                      : 'You must be registered at this practice to book.'}
                  </p>
                )}
                <div className="slot-actions">
                  <span className="slot-status">{slot.status === 'FREE' ? 'Available' : slot.status}</span>
                  <button type="button" onClick={() => onBook(slot)} disabled={slot.status !== 'FREE'}>
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

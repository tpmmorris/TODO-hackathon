import type { FHIRSlot } from '@gpnow/types';

interface SlotListProps {
  slots: FHIRSlot[];
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

export function SlotList({ slots, onBook }: SlotListProps) {
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
          slots.map((slot) => (
            <article className="slot-card" key={slot.id}>
              <div className="slot-time">
                <span>{formatSlot(slot.startTime)}</span>
                <small>{slot.practitionerRole}</small>
              </div>
              <span className="slot-status">{slot.status === 'FREE' ? 'Available' : slot.status}</span>
              <button type="button" onClick={() => onBook(slot)} disabled={slot.status !== 'FREE'}>
                Hold slot
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

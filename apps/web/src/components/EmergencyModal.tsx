import type { RedFlagResult } from '@gpnow/types';

interface EmergencyModalProps {
  result: RedFlagResult;
  onClose: () => void;
}

export function EmergencyModal({ result, onClose }: EmergencyModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="emergency-modal" role="alertdialog" aria-modal="true" aria-labelledby="emergency-title">
        <div className="alert-mark">!</div>
        <span className="eyebrow">Immediate action</span>
        <h2 id="emergency-title">Please call 999 now</h2>
        <p>
          Your answers may indicate a medical emergency. Do not wait for a GP appointment. If you can, unlock your
          front door and keep your phone nearby.
        </p>
        {result.matchedGuideline && <p className="guideline">Signal: {result.matchedGuideline}</p>}
        <a className="call-button" href="tel:999">
          Call 999
        </a>
        <button className="text-button" type="button" onClick={onClose}>
          I understand, return to GPNow
        </button>
      </section>
    </div>
  );
}

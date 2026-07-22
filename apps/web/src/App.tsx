import { useEffect, useState } from 'react';
import type { FHIRSlot, Practice, RedFlagResult, TriageResponse } from '@gpnow/types';
import { EmergencyModal } from './components/EmergencyModal';
import { PracticeMap } from './components/PracticeMap';
import { SlotList } from './components/SlotList';
import { VoiceRecorder } from './components/VoiceRecorder';
import { getPractices, getSlots, submitTriage } from './services/api';

const defaultSymptoms = 'Tell us what is happening, including when it started...';

export default function App() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [slots, setSlots] = useState<FHIRSlot[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice>();
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<TriageResponse>();
  const [emergency, setEmergency] = useState<RedFlagResult>();
  const [loading, setLoading] = useState(true);
  const [triaging, setTriaging] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([getPractices(), getSlots()]).then(([loadedPractices, loadedSlots]) => {
      setPractices(loadedPractices);
      setSlots(loadedSlots);
      setSelectedPractice(loadedPractices[0]);
      setLoading(false);
    });
  }, []);

  async function runTriage() {
    if (!symptoms.trim()) {
      setNotice('Add a few details before starting triage.');
      return;
    }
    setNotice('');
    setTriaging(true);
    const triageResponse = await submitTriage({
      patientId: 'demo-patient',
      symptoms,
      odsCode: selectedPractice?.odsCode,
      consentToProcess: true
    });
    setResult(triageResponse);
    setSlots(triageResponse.slots);
    setTriaging(false);
    if (triageResponse.redFlag.isRedFlag) setEmergency(triageResponse.redFlag);
  }

  async function selectPractice(practice: Practice) {
    setSelectedPractice(practice);
    setSlots(await getSlots(practice.odsCode));
  }

  function bookSlot(slot: FHIRSlot) {
    setNotice(`${slot.practitionerRole} appointment held for 10 minutes. Booking handoff is next.`);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="GPNow home">
          <span className="brand-mark">+</span>
          <span>GP<span>Now</span></span>
        </a>
        <div className="topbar-meta">
          <span className="secure-dot" />
          Prototype mode
          <button type="button" className="profile-button" aria-label="Open profile">
            JD
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">Cambridgeshire care navigator</span>
          <h1>Care, sooner.</h1>
          <p>Describe how you feel. GPNow checks urgency first, then finds the right appointment nearby.</p>
        </div>
        <div className="hero-stat">
          <strong>4.8 min</strong>
          <span>average to first option</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="triage-column">
          <div className="progress-row">
            <span className="step active"><b>1</b> Your symptoms</span>
            <span className="progress-line" />
            <span className="step"><b>2</b> Your options</span>
          </div>
          <section className="triage-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Private and secure</span>
                <h2>How are you feeling?</h2>
              </div>
              <span className="shield">◆</span>
            </div>
            <p className="helper-text">Share as much as you can. Our clinical safety layer will check for anything urgent.</p>
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder={defaultSymptoms}
              rows={6}
              aria-label="Describe your symptoms"
            />
            <div className="input-footer">
              <span>{symptoms.length}/1,000 characters</span>
              <VoiceRecorder onTranscript={setSymptoms} />
            </div>
            {notice && <p className="notice">{notice}</p>}
            <button className="primary-button" type="button" onClick={runTriage} disabled={triaging}>
              {triaging ? 'Checking safely...' : 'Find the right care'}
              <span>→</span>
            </button>
            <p className="legal-copy">Not a diagnosis. If you feel seriously unwell, call 999.</p>
          </section>
          <div className="trust-row">
            <span>Protected by clinical guardrails</span>
            <span>Data stays in the UK</span>
            <span>Built for NHS pathways</span>
          </div>
        </div>

        <div className="location-column">
          <div className="location-heading">
            <div>
              <span className="eyebrow">Step 2</span>
              <h2>Nearby practices</h2>
            </div>
            <button className="location-button" type="button">⌖ Cambridge</button>
          </div>
          <div className="map-frame">
            {loading ? <div className="map-loading">Loading local care network...</div> : <PracticeMap practices={practices} selectedOdsCode={selectedPractice?.odsCode} onSelect={selectPractice} />}
          </div>
          <div className="practice-strip">
            {selectedPractice ? (
              <div>
                <span className="eyebrow">Selected practice</span>
                <strong>{selectedPractice.name}</strong>
                <span>{selectedPractice.address}</span>
              </div>
            ) : (
              <span>Select a practice on the map</span>
            )}
            <span className="open-pill">Open today</span>
          </div>
        </div>
      </section>

      <SlotList slots={slots} onBook={bookSlot} />
      {result && !emergency && <p className="result-note">Safety check complete. {result.disclaimer}</p>}
      {emergency && <EmergencyModal result={emergency} onClose={() => setEmergency(undefined)} />}
    </main>
  );
}

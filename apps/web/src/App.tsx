import { useEffect, useState } from 'react';
import type { FHIRSlot, Practice, RedFlagResult, TriageResponse } from '@gpnow/types';
import { EmergencyModal } from './components/EmergencyModal';
import { PharmacyStock } from './components/PharmacyStock';
import { PracticeMap } from './components/PracticeMap';
import { SlotList } from './components/SlotList';
import { VoiceRecorder } from './components/VoiceRecorder';
import { getPractices, getSlots, submitTriage } from './services/api';

const defaultSymptoms = 'Tell us what is happening, including when it started...';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed';
}

type Tab = 'appointments' | 'pharmacy';

export default function App() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [slots, setSlots] = useState<FHIRSlot[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice>();
  const [registeredOdsCode, setRegisteredOdsCode] = useState<string>('');
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<TriageResponse>();
  const [emergency, setEmergency] = useState<RedFlagResult>();
  const [loading, setLoading] = useState(true);
  const [triaging, setTriaging] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [postcode, setPostcode] = useState('CB1 1AA');
  const [activeTab, setActiveTab] = useState<Tab>('appointments');

  useEffect(() => {
    void Promise.all([getPractices(), getSlots()])
      .then(([loadedPractices, loadedSlots]) => {
        setPractices(loadedPractices);
        setSlots(loadedSlots);
        setSelectedPractice(loadedPractices[0]);
        setLoading(false);
      })
      .catch((error: unknown) => {
        setLoadError(getErrorMessage(error));
        setLoading(false);
      });
  }, []);

  async function loadPractices(pc: string) {
    setLoading(true);
    try {
      const loadedPractices = await getPractices(pc);
      setPractices(loadedPractices);
      if (loadedPractices.length > 0) {
        setSelectedPractice(loadedPractices[0]);
        setSlots(await getSlots(loadedPractices[0].odsCode));
      } else {
        setSelectedPractice(undefined);
        setSlots([]);
      }
    } catch (error: unknown) {
      setNotice(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function runTriage() {
    if (!symptoms.trim()) {
      setNotice('Add a few details before starting triage.');
      return;
    }
    setNotice('');
    setEmergency(undefined);
    setTriaging(true);
    try {
      const triageResponse = await submitTriage({
        patientId: 'demo-patient',
        symptoms,
        odsCode: selectedPractice?.odsCode,
        registeredOdsCode: registeredOdsCode || undefined,
        consentToProcess: true
      });
      setResult(triageResponse);
      setSlots(triageResponse.slots);
      if (triageResponse.redFlag.isRedFlag) setEmergency(triageResponse.redFlag);
    } catch (error: unknown) {
      setNotice(getErrorMessage(error));
    } finally {
      setTriaging(false);
    }
  }

  async function selectPractice(practice: Practice) {
    try {
      const nextSlots = await getSlots(practice.odsCode);
      setSelectedPractice(practice);
      setSlots(nextSlots);
      setNotice('');
    } catch (error: unknown) {
      setNotice(getErrorMessage(error));
    }
  }

  function bookSlot(slot: FHIRSlot) {
    setNotice(`${slot.practitionerRole} appointment held for 10 minutes. Booking handoff is next.`);
  }

  function handlePostcodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    void loadPractices(postcode);
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
              <VoiceRecorder
                patientId="demo-patient"
                onTranscript={(text) => {
                  setSymptoms(text);
                  setNotice('');
                }}
                onError={setNotice}
              />
            </div>
            {loadError && <p className="notice error-notice">{loadError}</p>}
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
            <form className="postcode-form" onSubmit={handlePostcodeSubmit}>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="Enter postcode"
                aria-label="Postcode"
              />
              <button type="submit">Search</button>
            </form>
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
                {selectedPractice.distanceKm !== undefined && (
                  <small>{selectedPractice.distanceKm.toFixed(1)} km away</small>
                )}
              </div>
            ) : (
              <span>Select a practice on the map</span>
            )}
            <span className="open-pill">Open today</span>
          </div>
        </div>
      </section>

      {result && (
        <section className={`recommendation-card urgency-${result.recommendation.urgency.toLowerCase()}`} aria-labelledby="recommendation-title">
          <div>
            <span className="eyebrow">Care guidance</span>
            <h2 id="recommendation-title">{result.recommendation.suggestedAction}</h2>
            <p>{result.recommendation.summary}</p>
          </div>
          <span className="recommendation-urgency">{result.recommendation.urgency}</span>
        </section>
      )}

      <div className="tab-bar">
        <button
          type="button"
          className={activeTab === 'appointments' ? 'tab-active' : ''}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button
          type="button"
          className={activeTab === 'pharmacy' ? 'tab-active' : ''}
          onClick={() => setActiveTab('pharmacy')}
        >
          Pharmacy Stock
        </button>
      </div>

      {activeTab === 'appointments' && (
        <>
          <div className="registration-bar">
            <label htmlFor="registered-gp">
              <span>Your registered GP:</span>
              <select
                id="registered-gp"
                value={registeredOdsCode}
                onChange={(e) => setRegisteredOdsCode(e.target.value)}
                disabled={loading || practices.length === 0}
                aria-label="Select your registered GP"
              >
                <option value="">I am not registered / not sure</option>
                {practices
                  .filter((p) => p.type === 'GP')
                  .map((p) => (
                    <option key={p.odsCode} value={p.odsCode}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="registration-hint">
              {loading
                ? 'Loading nearby practices...'
                : practices.filter((p) => p.type === 'GP').length === 0
                  ? 'No GP practices found in this area.'
                  : registeredOdsCode
                    ? 'Appointments at your registered GP are bookable. Walk-in and urgent care options are always shown.'
                    : 'Walk-in centres and urgent care do not require registration.'}
            </p>
          </div>
          <SlotList slots={slots} registeredOdsCode={registeredOdsCode} onBook={bookSlot} />
        </>
      )}
      {activeTab === 'pharmacy' && <PharmacyStock postcode={postcode} />}

      {result && !emergency && <p className="result-note">Safety check complete. {result.disclaimer}</p>}
      {emergency && <EmergencyModal result={emergency} onClose={() => setEmergency(undefined)} />}
    </main>
  );
}

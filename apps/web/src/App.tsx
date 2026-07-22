import { useEffect, useState } from 'react';
import type { FHIRSlot, Practice, RedFlagResult, TriageResponse } from '@gpnow/types';
import { EmergencyModal } from './components/EmergencyModal';
import { LanguageSelector } from './components/LanguageSelector';
import { PharmacyStock } from './components/PharmacyStock';
import { PracticeMap } from './components/PracticeMap';
import { SlotList } from './components/SlotList';
import { VoiceRecorder } from './components/VoiceRecorder';
import { useI18n } from './i18n';
import { getPractices, getSlots, submitTriage } from './services/api';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed';
}

type Tab = 'appointments' | 'pharmacy';

export default function App() {
  const { t, lang } = useI18n();
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
      setNotice(t('triage.addDetails'));
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
        language: lang,
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
    setNotice(t('slots.booked', { role: slot.practitionerRole }));
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
          {t('topbar.mode')}
          <LanguageSelector />
          <button type="button" className="profile-button" aria-label="Open profile">
            JD
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">{t('hero.eyebrow')}</span>
          <h1>{t('hero.title')}</h1>
          <p>{t('hero.subtitle')}</p>
        </div>
        <div className="hero-stat">
          <strong>4.8 min</strong>
          <span>{t('hero.statLabel')}</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="triage-column">
          <div className="progress-row">
            <span className="step active"><b>1</b> {t('progress.step1')}</span>
            <span className="progress-line" />
            <span className="step"><b>2</b> {t('progress.step2')}</span>
          </div>
          <section className="triage-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">{t('triage.eyebrow')}</span>
                <h2>{t('triage.title')}</h2>
              </div>
              <span className="shield">◆</span>
            </div>
            <p className="helper-text">{t('triage.helper')}</p>
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder={t('triage.placeholder')}
              rows={6}
              aria-label={t('triage.title')}
            />
            <div className="input-footer">
              <span>{t('triage.characters', { n: symptoms.length })}</span>
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
              {triaging ? t('triage.checking') : t('triage.findCare')}
              <span>→</span>
            </button>
            <p className="legal-copy">{t('triage.legal')}</p>
          </section>
          <div className="trust-row">
            <span>{t('trust.guardrails')}</span>
            <span>{t('trust.dataUk')}</span>
            <span>{t('trust.nhs')}</span>
          </div>
        </div>

        <div className="location-column">
          <div className="location-heading">
            <div>
              <span className="eyebrow">{t('location.step')}</span>
              <h2>{t('location.title')}</h2>
            </div>
            <form className="postcode-form" onSubmit={handlePostcodeSubmit}>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder={t('location.postcodePlaceholder')}
                aria-label={t('location.postcodePlaceholder')}
              />
              <button type="submit">{t('location.search')}</button>
            </form>
          </div>
          <div className="map-frame">
            {loading ? <div className="map-loading">{t('location.loading')}</div> : <PracticeMap practices={practices} selectedOdsCode={selectedPractice?.odsCode} onSelect={selectPractice} />}
          </div>
          <div className="practice-strip">
            {selectedPractice ? (
              <div>
                <span className="eyebrow">{t('location.selected')}</span>
                <strong>{selectedPractice.name}</strong>
                <span>{selectedPractice.address}</span>
                {selectedPractice.distanceKm !== undefined && (
                  <small>{t('location.kmAway', { n: selectedPractice.distanceKm.toFixed(1) })}</small>
                )}
              </div>
            ) : (
              <span>{t('location.selectPrompt')}</span>
            )}
            <span className="open-pill">{t('location.openToday')}</span>
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
          {t('tabs.appointments')}
        </button>
        <button
          type="button"
          className={activeTab === 'pharmacy' ? 'tab-active' : ''}
          onClick={() => setActiveTab('pharmacy')}
        >
          {t('tabs.pharmacy')}
        </button>
      </div>

      {activeTab === 'appointments' && (
        <>
          <div className="registration-bar">
            <label htmlFor="registered-gp">
              <span>{t('registration.label')}</span>
              <select
                id="registered-gp"
                value={registeredOdsCode}
                onChange={(e) => setRegisteredOdsCode(e.target.value)}
                disabled={loading || practices.length === 0}
                aria-label={t('registration.label')}
              >
                <option value="">{t('registration.notRegistered')}</option>
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
                ? t('registration.loading')
                : practices.filter((p) => p.type === 'GP').length === 0
                  ? t('registration.noGp')
                  : registeredOdsCode
                    ? t('registration.registeredHint')
                    : t('registration.walkInHint')}
            </p>
          </div>
          <SlotList slots={slots} registeredOdsCode={registeredOdsCode} onBook={bookSlot} />
        </>
      )}
      {activeTab === 'pharmacy' && <PharmacyStock postcode={postcode} />}

      {result && !emergency && <p className="result-note">{t('result.complete')} {result.disclaimer}</p>}
      {emergency && <EmergencyModal result={emergency} onClose={() => setEmergency(undefined)} />}
    </main>
  );
}

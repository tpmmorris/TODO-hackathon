import { useState } from 'react';
import type { PharmacyWithStock } from '@gpnow/types';
import { useI18n } from '../i18n';
import type { Language } from '../i18n/translations';
import { getPharmacyStock } from '../services/api';

interface PharmacyStockProps {
  postcode: string;
}

const localeMap: Record<Language, string> = {
  en: 'en-GB',
  cy: 'cy-GB',
  pl: 'pl-PL'
};

function stockLevelClass(quantity: number): string {
  if (quantity === 0) return 'stock-out';
  if (quantity <= 10) return 'stock-low';
  return 'stock-good';
}

export function PharmacyStock({ postcode }: PharmacyStockProps) {
  const { t, lang } = useI18n();
  const [medicine, setMedicine] = useState('');
  const [results, setResults] = useState<PharmacyWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function stockLabel(quantity: number): string {
    if (quantity === 0) return t('pharmacy.outOfStock');
    if (quantity <= 10) return t('pharmacy.lowStock');
    return t('pharmacy.inStock');
  }

  async function search() {
    if (!medicine.trim() || !postcode.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await getPharmacyStock(postcode, medicine);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pharmacy-panel" aria-labelledby="pharmacy-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('pharmacy.eyebrow')}</span>
          <h2 id="pharmacy-title">{t('pharmacy.title')}</h2>
        </div>
      </div>

      <div className="pharmacy-search">
        <input
          type="text"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          placeholder={t('pharmacy.placeholder')}
          aria-label={t('pharmacy.placeholder')}
        />
        <button type="button" onClick={search} disabled={loading || !medicine.trim()}>
          {loading ? t('pharmacy.searching') : t('pharmacy.search')}
        </button>
      </div>

      {!searched && <p className="empty-state">{t('pharmacy.prompt')}</p>}

      {searched && results.length === 0 && !loading && (
        <p className="empty-state">{t('pharmacy.noResults')}</p>
      )}

      <div className="pharmacy-list">
        {results.map((pharmacy) => {
          const matchedMedicine = Object.entries(pharmacy.stock).find(([key]) =>
            key.toLowerCase().includes(medicine.toLowerCase())
          );
          const quantity = matchedMedicine?.[1].quantity ?? 0;
          const lastChecked = matchedMedicine?.[1].lastChecked
            ? new Date(matchedMedicine[1].lastChecked).toLocaleDateString(localeMap[lang])
            : '—';

          return (
            <article className="pharmacy-card" key={pharmacy.pharmacyId}>
              <div className="pharmacy-info">
                <strong>{pharmacy.name}</strong>
                <span>{pharmacy.address}</span>
                {pharmacy.distanceKm !== undefined && (
                  <small>{t('location.kmAway', { n: pharmacy.distanceKm.toFixed(1) })}</small>
                )}
              </div>
              <div className={`pharmacy-stock ${stockLevelClass(quantity)}`}>
                <span className="stock-badge">{stockLabel(quantity)}</span>
                <span className="stock-qty">{t('pharmacy.units', { n: quantity })}</span>
                <span className="stock-date">{t('pharmacy.updated', { date: lastChecked })}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

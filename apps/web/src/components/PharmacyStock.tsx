import { useState } from 'react';
import type { PharmacyWithStock } from '@gpnow/types';
import { getPharmacyStock } from '../services/api';

interface PharmacyStockProps {
  postcode: string;
}

function stockLevelClass(quantity: number): string {
  if (quantity === 0) return 'stock-out';
  if (quantity <= 10) return 'stock-low';
  return 'stock-good';
}

function stockLabel(quantity: number): string {
  if (quantity === 0) return 'Out of stock';
  if (quantity <= 10) return 'Low stock';
  return 'In stock';
}

export function PharmacyStock({ postcode }: PharmacyStockProps) {
  const [medicine, setMedicine] = useState('');
  const [results, setResults] = useState<PharmacyWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
          <span className="eyebrow">Medication availability</span>
          <h2 id="pharmacy-title">Check nearby pharmacy stock</h2>
        </div>
      </div>

      <div className="pharmacy-search">
        <input
          type="text"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          placeholder="e.g. paracetamol, ibuprofen..."
          aria-label="Medicine name"
        />
        <button type="button" onClick={search} disabled={loading || !medicine.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {!searched && <p className="empty-state">Enter a medicine name to see stock at nearby pharmacies.</p>}

      {searched && results.length === 0 && !loading && (
        <p className="empty-state">No pharmacies found with that medicine in stock nearby.</p>
      )}

      <div className="pharmacy-list">
        {results.map((pharmacy) => {
          const matchedMedicine = Object.entries(pharmacy.stock).find(([key]) =>
            key.toLowerCase().includes(medicine.toLowerCase())
          );
          const quantity = matchedMedicine?.[1].quantity ?? 0;
          const lastChecked = matchedMedicine?.[1].lastChecked
            ? new Date(matchedMedicine[1].lastChecked).toLocaleDateString('en-GB')
            : 'Unknown';

          return (
            <article className="pharmacy-card" key={pharmacy.pharmacyId}>
              <div className="pharmacy-info">
                <strong>{pharmacy.name}</strong>
                <span>{pharmacy.address}</span>
                {pharmacy.distanceKm !== undefined && (
                  <small>{pharmacy.distanceKm.toFixed(1)} km away</small>
                )}
              </div>
              <div className={`pharmacy-stock ${stockLevelClass(quantity)}`}>
                <span className="stock-badge">{stockLabel(quantity)}</span>
                <span className="stock-qty">{quantity} units</span>
                <span className="stock-date">Updated {lastChecked}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

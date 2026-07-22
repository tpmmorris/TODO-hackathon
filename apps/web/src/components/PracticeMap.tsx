import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Practice } from '@gpnow/types';
import 'leaflet/dist/leaflet.css';

interface PracticeMapProps {
  practices: Practice[];
  selectedOdsCode?: string;
  onSelect: (practice: Practice) => void;
}

export function PracticeMap({ practices, selectedOdsCode, onSelect }: PracticeMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapElement.current || map.current) return;
    map.current = L.map(mapElement.current, { zoomControl: false }).setView([52.2053, 0.1218], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map.current);
    markers.current = L.layerGroup().addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
      markers.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !markers.current) return;
    markers.current.clearLayers();
    practices.forEach((practice) => {
      const marker = L.circleMarker([practice.latitude, practice.longitude], {
        radius: practice.odsCode === selectedOdsCode ? 10 : 7,
        color: '#f7fbff',
        weight: 3,
        fillColor: practice.odsCode === selectedOdsCode ? '#e86a33' : '#1f7a8c',
        fillOpacity: 1
      });
      marker.bindTooltip(practice.name, { direction: 'top', offset: [0, -8] });
      marker.on('click', () => onSelect(practice));
      marker.addTo(markers.current!);
    });
  }, [onSelect, practices, selectedOdsCode]);

  return <div className="practice-map" ref={mapElement} aria-label="Map of nearby GP practices" />;
}

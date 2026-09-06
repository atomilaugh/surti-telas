import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Map, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Entrega } from './RutaDelDia';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import s from './RutaDelDia.module.css';

const createIcon = (label: string, color: string, isSelected: boolean) => {
  const size = isSelected ? 44 : 36;
  const stroke = isSelected ? 4 : 3;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="#fff" stroke-width="${stroke}"/>
      <text x="18" y="22" text-anchor="middle" fill="#fff" font-size="${isSelected ? 16 : 14}" font-weight="700">${label}</text>
    </svg>
  `;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const icon = new L.Icon({
    iconUrl: url,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  return icon;
};

interface OsrmStep {
  maneuver?: { type?: string };
  name?: string;
  distance?: number;
  duration?: number;
}

interface OsrmLeg {
  steps?: OsrmStep[];
}

interface OsrmRoute {
  legs: OsrmLeg[];
}

const statusColor = (estado: Entrega['estado']) => {
  if (estado === 'Entregado') return '#10b981';
  if (estado === 'En camino') return '#C4A574';
  if (estado === 'Fallido') return '#ef4444';
  return '#f59e0b';
};

const FitMap = ({ markers }: { markers: { lat: number; lng: number }[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [map, markers]);
  return null;
};

const MapResize = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

interface RouteMapProps {
  entregas: Entrega[];
  selectedId?: string | null;
  onSelect: (entrega: Entrega) => void;
  isNavigating?: boolean;
  onToggleNavigation?: (active: boolean) => void;
}

export const RouteMap: React.FC<RouteMapProps> = ({ entregas, selectedId, onSelect, isNavigating, onToggleNavigation }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [instructions, setInstructions] = useState<{ text: string; distance?: string; duration?: string }[]>([]);
  const [positionHistory, setPositionHistory] = useState<{ lat: number; lng: number; timestamp: string }[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const geocodeAll = async () => {
      setLoadingMap(true);
      setRouteCoords([]);
      const results: { lat: number; lng: number }[] = [];
      for (const e of entregas) {
        const coord = await geocodeAddress(`${e.direccion}, ${e.barrio}`);
        if (cancelled) return;
        if (coord) results.push(coord);
      }
      if (!cancelled) {
        setCoords(results);
        setLoadingMap(false);
      }
    };
    if (entregas.length > 0) {
      void geocodeAll();
    } else {
      setLoadingMap(false);
    }
    return () => { cancelled = true; };
  }, [entregas]);

  useEffect(() => {
    let cancelled = false;
    const loadRoute = async () => {
      if (coords.length < 2) {
        setRouteCoords([]);
        return;
      }
      setLoadingRoute(true);
      try {
        const origin = currentPosition ? `${currentPosition[1]},${currentPosition[0]}` : `${coords[0].lng},${coords[0].lat}`;
        const destination = `${coords[coords.length - 1].lng},${coords[coords.length - 1].lat}`;
        const intermediates = coords.length > 2 ? coords.slice(1, -1).map((c) => `${c.lng},${c.lat}`).join(';') : undefined;
        const url = intermediates
          ? `https://router.project-osrm.org/route/v1/driving/${origin};${intermediates};${destination}?overview=full&geometries=geojson`
          : `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled && data.routes && data.routes[0]) {
          const points: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          setRouteCoords(points);
        }
      } catch {
        if (!cancelled) setRouteCoords([]);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    };
    if (coords.length >= 2) {
      void loadRoute();
    }
    return () => { cancelled = true; };
  }, [coords, currentPosition]);

  const markers = useMemo(() => {
    return entregas.map((e, idx) => {
      const coord = coords[idx];
      if (!coord) return null;
      return {
        id: e.id,
        position: [coord.lat, coord.lng] as [number, number],
        label: String(idx + 1),
        color: statusColor(e.estado),
        entrega: e,
      };
    }).filter(Boolean) as { id: string; position: [number, number]; label: string; color: string; entrega: Entrega }[];
  }, [entregas, coords]);

  const openNavigation = (entrega: Entrega) => {
    const query = encodeURIComponent(`${entrega.direccion}, ${entrega.barrio}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank', 'noopener');
  };

  const center = coords.length > 0 ? [coords[0].lat, coords[0].lng] : ([4.6097, -74.0817] as [number, number]);

  useEffect(() => {
    if (!isNavigating) return;
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = [pos.coords.latitude, pos.coords.longitude] as [number, number];
        setCurrentPosition(next);
        setPositionHistory((prev) => [
          ...prev,
          { lat: next[0], lng: next[1], timestamp: new Date().toISOString() },
        ]);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isNavigating]);

  useEffect(() => {
    let cancelled = false;
    const loadInstructions = async () => {
      if (routeCoords.length < 2) {
        setInstructions([]);
        return;
      }
      try {
        const coordinates = routeCoords.map((c) => `${c[1]},${c[0]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&steps=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled && data.routes && data.routes[0]) {
          const steps = (data.routes[0] as OsrmRoute).legs.flatMap((leg) => leg.steps || []);
          setInstructions(
            steps.map((step: OsrmStep) => ({
              text: step.maneuver?.type || step.name || 'Continúa',
              distance: step.distance ? `${(step.distance / 1000).toFixed(1)} km` : undefined,
              duration: step.duration ? `${Math.round(step.duration / 60)} min` : undefined,
            }))
          );
        }
      } catch {
        if (!cancelled) setInstructions([]);
      }
    };
    if (routeCoords.length >= 2) {
      void loadInstructions();
    }
    return () => { cancelled = true; };
  }, [routeCoords]);

  useEffect(() => {
    if (!isNavigating || !voiceEnabled || !instructions.length) return;
    const last = instructions[instructions.length - 1].text;
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(last);
    utterance.lang = 'es-CO';
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
  }, [instructions, isNavigating, voiceEnabled]);

  return (
    <div className={s.mapContainer}>
      {(loadingMap || loadingRoute) && (
        <div className={s.mapPlaceholder}>
          <div className={s.mapGrid} />
          <div className={s.mapIcon}><Map size={48} /></div>
          <div className={s.mapText}>
            {loadingMap ? 'Calculando coordenadas de la ruta...' : 'Generando ruta de navegación...'}
          </div>
        </div>
      )}
      <MapContainer
        center={center as [number, number]}
        zoom={13}
        className={s.mapLeaflet}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapResize />
        <FitMap markers={markers.map((m) => ({ lat: m.position[0], lng: m.position[1] }))} />

        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: '#C4A574', weight: 5, opacity: 0.8 }}
          />
        )}

        {markers.map((m, idx) => {
          const isSelected = selectedId === m.id;
          const icon = createIcon(m.label, m.color, isSelected);
          return (
            <Marker
              key={m.id}
              position={m.position}
              icon={icon}
              eventHandlers={{
                click: () => onSelect(m.entrega),
              }}
            >
              <Popup>
                <div style={{ fontSize: 12, minWidth: 160 }}>
                  <strong>Parada {idx + 1}</strong>
                  <div>{m.entrega.cliente}</div>
                  <div>{m.entrega.direccion}, {m.entrega.barrio}</div>
                  <div style={{ marginTop: 6 }}>
                    <StatusBadge status={m.entrega.estado} />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={() => openNavigation(m.entrega)}
                  >
                    <Navigation size={14} />
                    Ir ahora
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 30, display: 'flex', gap: 8 }}>
        <Button
          size="sm"
          variant={isNavigating ? 'danger' : 'primary'}
          onClick={() => onToggleNavigation?.(!isNavigating)}
        >
          {isNavigating ? 'Detener navegación' : 'Iniciar navegación GPS'}
        </Button>
        {isNavigating && (
          <Button
            size="sm"
            variant={voiceEnabled ? 'secondary' : 'ghost'}
            onClick={() => setVoiceEnabled((v) => !v)}
          >
            {voiceEnabled ? 'Voz: ON' : 'Voz: OFF'}
          </Button>
        )}
      </div>

      {isNavigating && instructions.length > 0 && (
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 30, maxHeight: 200, overflowY: 'auto', background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Indicaciones</div>
          {instructions.map((inst, idx) => (
            <div key={idx} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{inst.text}</span>
              {(inst.distance || inst.duration) && (
                <span style={{ color: '#666', whiteSpace: 'nowrap' }}>
                  {[inst.distance, inst.duration].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isNavigating && positionHistory.length > 0 && (
        <div style={{ position: 'absolute', bottom: 80, left: 16, zIndex: 30, maxHeight: 160, overflowY: 'auto', background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>Historial GPS</div>
          {positionHistory.map((pos, idx) => (
            <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>
              <span style={{ color: '#666', whiteSpace: 'nowrap' }}>{new Date(pos.timestamp).toLocaleTimeString('es-CO')}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={async () => {
              const blob = new Blob([JSON.stringify(positionHistory, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ruta-${new Date().toISOString()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ marginTop: 8, width: '100%' }}
          >
            Descargar historial
          </button>
        </div>
      )}
    </div>
  );
};

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(address);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SurtiTelas-Domiciliario/1.0',
      },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    return { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
  } catch {
    return null;
  }
}

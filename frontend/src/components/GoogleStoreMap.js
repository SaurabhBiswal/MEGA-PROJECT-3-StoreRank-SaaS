import React, { useMemo, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Navigation, Star, MapPin, ExternalLink } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '20px',
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

const defaultOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

const GoogleStoreMap = ({ stores = [], activeStore = null, onMarkerClick = null }) => {
  const [selectedStore, setSelectedStore] = useState(activeStore || null);
  const [map, setMap] = useState(null);

  const center = useMemo(() => {
    if (activeStore && activeStore.latitude && activeStore.longitude) {
      return { lat: parseFloat(activeStore.latitude), lng: parseFloat(activeStore.longitude) };
    }
    return defaultCenter;
  }, [activeStore]);

  const zoom = activeStore ? 16 : 13;

  const getDirectionsUrl = (store) => {
    if (!store.latitude || !store.longitude) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
  };

  const handleMarkerClick = (store) => {
    setSelectedStore(store);
    if (onMarkerClick) onMarkerClick(store);
  };

  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  // Fallback to Leaflet if no Google Maps API key
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️ Google Maps API key not found. Using enhanced Leaflet fallback.');
    return (
      <div className="w-full h-full rounded-[20px] overflow-hidden border border-slate-200">
        <iframe
          title="map-fallback"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.01},${center.lat - 0.01},${center.lng + 0.01},${center.lat + 0.01}&layer=mapnik&marker=${center.lat},${center.lng}`}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={defaultOptions}
        onLoad={(map) => setMap(map)}
      >
        {stores
          .filter((store) => store.latitude && store.longitude)
          .map((store) => {
            const iconSvg = `
              <svg width="40" height="50" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0C9 0 0 9 0 20c0 11 20 30 20 30s20-19 20-30C40 9 31 0 20 0z" fill="#6c5ce7"/>
                <circle cx="20" cy="20" r="8" fill="white"/>
                <text x="20" y="25" font-size="12" fill="#6c5ce7" text-anchor="middle" font-weight="bold">${(store.average_rating || 0).toFixed(1)}</text>
              </svg>
            `;
            const iconUrl = `data:image/svg+xml;base64,${btoa(iconSvg)}`;

            return (
              <Marker
                key={store.id}
                position={{
                  lat: parseFloat(store.latitude),
                  lng: parseFloat(store.longitude),
                }}
                onClick={() => handleMarkerClick(store)}
                icon={{
                  url: iconUrl,
                  scaledSize: map ? new window.google.maps.Size(40, 50) : undefined,
                  anchor: map ? new window.google.maps.Point(20, 50) : undefined,
                }}
              />
            );
          })}

        {selectedStore && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedStore.latitude),
              lng: parseFloat(selectedStore.longitude),
            }}
            onCloseClick={() => setSelectedStore(null)}
          >
            <div className="p-4 min-w-[250px]">
              <h3 className="font-bold text-lg text-slate-800 mb-2">{selectedStore.name}</h3>
              <div className="flex items-center gap-2 mb-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-2">{selectedStore.address}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-slate-800">{selectedStore.average_rating || 0}/5</span>
                <span className="text-xs text-slate-500">({selectedStore.total_ratings || 0} reviews)</span>
              </div>
              <a
                href={getDirectionsUrl(selectedStore)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all text-sm font-bold"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default GoogleStoreMap;

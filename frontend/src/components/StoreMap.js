import React from 'react';
import GoogleStoreMap from './GoogleStoreMap';

// Enhanced StoreMap that uses Google Maps (with Leaflet fallback)
const StoreMap = ({ stores, activeStore, onMarkerClick }) => {
  return (
    <div className="map-container" style={{ height: '100%', width: '100%', borderRadius: '20px', overflow: 'hidden' }}>
      <GoogleStoreMap stores={stores} activeStore={activeStore} onMarkerClick={onMarkerClick} />
    </div>
  );
};

export default StoreMap;

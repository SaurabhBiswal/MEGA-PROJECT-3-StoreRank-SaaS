import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to handle map re-centering and zooming
const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            // Zoom in deep for street level pinpointing
            map.setView(center, 17, { animate: true });
        }
    }, [center, map]);
    return null;
};

const LocationPicker = ({ initialPos, onLocationSelect }) => {
    const [position, setPosition] = useState(initialPos || [12.9716, 77.5946]);

    // Sync state when parent updates initialPos (e.g. from address search)
    useEffect(() => {
        if (initialPos && (initialPos[0] !== position[0] || initialPos[1] !== position[1])) {
            setPosition(initialPos);
        }
    }, [initialPos, position]);

    const handleGPS = () => {
        if (!navigator.geolocation) return alert("Geolocation is not supported by your browser");

        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            setPosition([latitude, longitude]);
            onLocationSelect(latitude, longitude);
        }, (err) => {
            alert("Unable to retrieve your location. Please check browser permissions.");
        });
    };

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;
                setPosition([lat, lng]);
                onLocationSelect(lat, lng);
            },
        });
        return null;
    };

    return (
        <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
            <div style={{ height: '350px', width: '100%', borderRadius: '15px', overflow: 'hidden', border: '2px solid rgba(0,0,0,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <MapController center={position} />
                    <MapEvents />
                    {position && <Marker position={position} draggable={true} eventHandlers={{
                        dragend: (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            setPosition([lat, lng]);
                            onLocationSelect(lat, lng);
                        }
                    }} />}
                </MapContainer>

                {/* GPS Button Overlay */}
                <button
                    onClick={handleGPS}
                    type="button"
                    style={{
                        position: 'absolute', top: '20px', right: '20px', zIndex: 1000,
                        background: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    title="Detect My Location"
                >
                    🛰️
                </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>
                    💡 Drag the pin for <b>exact</b> shop location.
                </p>
                <div style={{ background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', color: '#888' }}>
                    {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </div>
            </div>
        </div>
    );
};

export default LocationPicker;

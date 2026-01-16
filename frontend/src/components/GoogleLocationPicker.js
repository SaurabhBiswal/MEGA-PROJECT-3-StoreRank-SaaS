import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Locate } from 'lucide-react';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '20px',
};

const defaultCenter = {
    lat: 28.5905, // Mahavir Enclave approx center
    lng: 77.0805,
};

const GoogleLocationPicker = ({ initialPos, onLocationSelect }) => {
    // initialPos is [lat, lng] array
    const [markerPos, setMarkerPos] = useState(null);
    const [map, setMap] = useState(null);

    useEffect(() => {
        if (initialPos && initialPos[0] && initialPos[1]) {
            setMarkerPos({ lat: parseFloat(initialPos[0]), lng: parseFloat(initialPos[1]) });
        }
    }, [initialPos]);

    // Auto-pan to new position when resolved via Geocode button
    useEffect(() => {
        if (map && markerPos) {
            map.panTo(markerPos);
            map.setZoom(18); // Zoom deep for precision
        }
    }, [markerPos, map]);

    const onMapClick = useCallback((e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPos({ lat, lng });
        onLocationSelect(lat, lng);
    }, [onLocationSelect]);

    const onMarkerDragEnd = useCallback((e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPos({ lat, lng });
        onLocationSelect(lat, lng);
    }, [onLocationSelect]);

    const handleGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setMarkerPos({ lat: latitude, lng: longitude });
                onLocationSelect(latitude, longitude);
                if (map) {
                    map.panTo({ lat: latitude, lng: longitude });
                    map.setZoom(18);
                }
            });
        }
    };

    const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400 font-bold">
                Google Maps API Key Missing
            </div>
        );
    }

    return (
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <div className="relative w-full h-full">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={markerPos || defaultCenter}
                    zoom={13}
                    onClick={onMapClick}
                    onLoad={setMap}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        clickableIcons: false, // Prevent clicking on POIs opening info windows
                    }}
                >
                    {markerPos && (
                        <Marker
                            position={markerPos}
                            draggable={true}
                            onDragEnd={onMarkerDragEnd}
                            animation={window.google?.maps?.Animation?.DROP}
                        />
                    )}
                </GoogleMap>

                {/* GPS Button */}
                <button
                    type="button"
                    onClick={handleGPS}
                    className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg hover:bg-slate-50 transition-all z-10 text-primary"
                    title="Use My Location"
                >
                    <Locate className="w-6 h-6" />
                </button>
            </div>
        </LoadScript>
    );
};

export default GoogleLocationPicker;

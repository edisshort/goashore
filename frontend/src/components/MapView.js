import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapView.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function MapView({ beaches }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Create map
    const map = L.map(mapContainer.current).setView([15.3, 73.8], 9);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach(marker => mapRef.current.removeLayer(marker));
    markersRef.current = [];

    // Add new markers
    beaches.forEach(beach => {
      let markerColor = '#0fb981';
      if (beach.status === 'dirty') markerColor = '#d32f2f';
      if (beach.status === 'help-needed') markerColor = '#ff9800';

      const marker = L.circleMarker([beach.latitude, beach.longitude], {
        radius: 12,
        fillColor: markerColor,
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(mapRef.current);

      marker.bindPopup(`<strong>${beach.name}</strong><br/>${beach.description}`);
      markersRef.current.push(marker);
    });
  }, [beaches]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot clean"></span>
          <span>Clean</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot help"></span>
          <span>Help Needed</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dirty"></span>
          <span>Dirty</span>
        </div>
      </div>
    </div>
  );
}

export default MapView;
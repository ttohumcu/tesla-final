
import React from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip } from 'react-leaflet';
import type { Trip } from '../../types';
import { useUnits } from '../../hooks/useUnits';

interface TripMapProps {
  trips: Trip[];
}

export const TripMap: React.FC<TripMapProps> = ({ trips }) => {
  const { convertKm, labels } = useUnits();

  const displayTrips = trips.filter(t => t.path && t.path.length > 1);
  
  if (displayTrips.length === 0) {
    return <p className="text-center p-4 h-full flex items-center justify-center">No trips with path data to display on the map.</p>;
  }

  const bounds = displayTrips.flatMap(t => t.path);

  return (
    <MapContainer bounds={bounds} boundsOptions={{ padding: [50, 50] }} scrollWheelZoom={false} className="leaflet-container">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {displayTrips.map((trip) => (
        <Polyline key={trip.id} positions={trip.path} color="#3E6AE1">
          <Tooltip sticky>
            <strong>Trip #{trip.id}</strong><br />
            Distance: {convertKm(trip.distanceKm).toFixed(1)} {labels.distance}<br />
            Duration: {trip.durationMinutes} min
          </Tooltip>
        </Polyline>
      ))}
    </MapContainer>
  );
};
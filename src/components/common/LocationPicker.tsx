'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, TextField, InputAdornment, IconButton, Paper, Autocomplete, CircularProgress } from '@mui/material';
import { Search, MyLocation } from '@mui/icons-material';

// Fix Leaflet default icon issue using CDN
const customIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Interface for Nominatim search results
interface NominatimResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    boundingbox: string[];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
}

interface LocationPickerProps {
    latitude?: number;
    longitude?: number;
    radius?: number;
    onChange: (lat: number, lng: number) => void;
    onRadiusChange?: (radius: number) => void;
    error?: string;
}

// Component to handle map clicks
function LocationMarker({
    position,
    setPosition
}: {
    position: L.LatLng | null,
    setPosition: (pos: L.LatLng) => void
}) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker position={position} draggable={true} icon={customIcon} eventHandlers={{
            dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                setPosition(position);
            },
        }}>
            <Popup>الموقع المحدد</Popup>
        </Marker>
    );
}

// Component to center map when props change externaly
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function LocationPicker({
    latitude,
    longitude,
    radius = 100, // default 100 meters
    onChange,
    onRadiusChange,
    error,
}: LocationPickerProps) {
    // Default to Riyadh if no coordinates provided
    const defaultCenter: [number, number] = [24.7136, 46.6753];

    const [position, setPosition] = useState<L.LatLng | null>(
        latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null
            ? new L.LatLng(latitude, longitude)
            : null
    );

    const [searchText, setSearchText] = useState('');

    // Update internal state when props change
    useEffect(() => {
        if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
            setPosition(new L.LatLng(latitude, longitude));
        }
    }, [latitude, longitude]);

    const handlePositionChange = (newPos: L.LatLng) => {
        setPosition(newPos);
        onChange(newPos.lat, newPos.lng);
    };

    const mapCenter: [number, number] = position
        ? [position.lat, position.lng]
        : defaultCenter;

    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<NominatimResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');

    // Debounced search function
    useEffect(() => {
        let active = true;

        if (inputValue === '') {
            setOptions([]);
            return undefined;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&addressdetails=1&limit=5&accept-language=ar&viewbox=34.0,33.0,56.0,16.0&bounded=0`,
                    {
                        headers: {
                            'User-Agent': 'TechnoProject/1.0'
                        }
                    }
                );
                const data = await response.json();

                if (active) {
                    setOptions(data || []);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => {
            active = false;
            clearTimeout(delayDebounceFn);
        };
    }, [inputValue]);

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
                handlePositionChange(newPos);
            });
        }
    };

    return (
        <Box sx={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative', borderRadius: 2, overflow: 'hidden', border: error ? '2px solid #d32f2f' : '1px solid #e0e0e0' }}>

            {/* Search Bar Overlay */}
            <Paper
                elevation={3}
                sx={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    right: 50,
                    zIndex: 1001, // Higher than map controls
                    p: 0,
                    display: 'flex',
                    alignItems: 'center',
                    maxWidth: 400,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(5px)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <Autocomplete
                    id="location-search"
                    sx={{ width: '100%' }}
                    open={open}
                    onOpen={() => setOpen(true)}
                    onClose={() => setOpen(false)}
                    isOptionEqualToValue={(option, value) => option.display_name === value.display_name}
                    getOptionLabel={(option) => option.display_name || ''}
                    options={options}
                    loading={loading}
                    disablePortal
                    filterOptions={(x) => x} // Disable client-side filtering
                    noOptionsText={inputValue ? "لا توجد نتائج" : "ابحث عن موقع"}
                    onInputChange={(event, newInputValue) => {
                        setInputValue(newInputValue);
                    }}
                    onChange={(event, newValue: NominatimResult | null) => {
                        if (newValue) {
                            const newPos = new L.LatLng(parseFloat(newValue.lat), parseFloat(newValue.lon));
                            handlePositionChange(newPos);
                            setOpen(false);
                        }
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="ابحث عن موقع..."
                            fullWidth
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { border: 'none' },
                                },
                            }}
                            slotProps={{
                                input: {
                                    ...params.InputProps,
                                    startAdornment: (
                                        <InputAdornment position="start" sx={{ pl: 1 }}>
                                            <Search color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <>
                                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }
                            }}
                        />
                    )}
                    renderOption={(props, option) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { key, ...otherProps } = props;
                        return (
                            <li key={option.place_id} {...otherProps}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                    <Search fontSize="small" color="action" sx={{ mt: 0.5 }} />
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {option.display_name.split(',')[0]}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {option.display_name}
                                        </Typography>
                                    </Box>
                                </Box>
                            </li>
                        );
                    }}
                />
            </Paper>

            {/* Current Location Button */}
            <Paper
                elevation={3}
                sx={{
                    position: 'absolute',
                    top: 90,
                    left: 10,
                    zIndex: 1000,
                    borderRadius: '50%'
                }}
            >
                <IconButton onClick={handleCurrentLocation} color="primary">
                    <MyLocation />
                </IconButton>
            </Paper>

            {/* Radius Input Overlay */}
            {onRadiusChange && (
                <Paper
                    elevation={3}
                    sx={{
                        position: 'absolute',
                        bottom: 20,
                        left: 10,
                        zIndex: 1000,
                        p: 1,
                        width: 150
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <TextField
                        label="نطاق الحضور (متر)"
                        type="number"
                        size="small"
                        fullWidth
                        value={radius}
                        onChange={(e) => onRadiusChange(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Paper>
            )}

            <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Helper to center map on external updates */}
                {position && <MapUpdater center={[position.lat, position.lng]} />}

                <LocationMarker position={position} setPosition={handlePositionChange} />

                {position && radius && (
                    <Circle
                        center={position}
                        radius={radius}
                        pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                    />
                )}
            </MapContainer>

            {error && (
                <Typography variant="caption" color="error" sx={{ position: 'absolute', bottom: -20, right: 0 }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
}

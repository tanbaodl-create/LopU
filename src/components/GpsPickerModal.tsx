import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Check,
  ZoomIn,
  ZoomOut,
  Search,
  RefreshCw,
  Layers,
  SlidersHorizontal,
  X,
  Maximize2,
  Info,
} from 'lucide-react';

interface GpsPickerModalProps {
  title?: string;
  userNameOrContext?: string;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onConfirm: (coordsStr: string, lat: number, lng: number) => void;
}

export const GpsPickerModal: React.FC<GpsPickerModalProps> = ({
  title = 'Google Maps — Bản Đồ Vị Trí GPS Lớp Học',
  userNameOrContext,
  initialLat = 15.172233,
  initialLng = 108.667440,
  onClose,
  onConfirm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [selectedLat, setSelectedLat] = useState<number>(initialLat);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [addressSearch, setAddressSearch] = useState<string>('');
  const [isGeolocating, setIsGeolocating] = useState<boolean>(false);
  
  // Toggleable Tools Bar State (Ẩn / Hiện thanh công cụ phụ)
  const [showTools, setShowTools] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false, // We use custom floating zoom buttons
    });

    mapInstanceRef.current = map;

    // Default tile layer (Google Roadmap vs Google Hybrid Satellite)
    const initialTileUrl =
      mapType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    const tileLayer = L.tileLayer(initialTileUrl, {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Custom Icon for Marker Pin
    const createPinIcon = (lat: number, lng: number) => {
      return L.divIcon({
        className: 'custom-gps-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); pointer-events:none;">
            <div style="background:rgba(15, 23, 42, 0.95); color:#ffffff; font-size:11px; font-weight:bold; font-family:monospace; padding:3px 8px; border-radius:6px; border:1px solid #475569; white-space:nowrap; box-shadow:0 6px 16px rgba(0,0,0,0.4); margin-bottom:2px;">
              ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#e11d48" stroke="#ffffff" stroke-width="1.8" style="filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.5));">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3" fill="#ffffff"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
    };

    // Add Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createPinIcon(initialLat, initialLng),
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;

    // Handle map click to place pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedLat(lat);
      setSelectedLng(lng);
      marker.setLatLng([lat, lng]);
      marker.setIcon(createPinIcon(lat, lng));
    });

    // Handle marker drag end
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      setSelectedLat(position.lat);
      setSelectedLng(position.lng);
      marker.setIcon(createPinIcon(position.lat, position.lng));
    });

    // Resize map when window changes or modal opens
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Change Map Type Layer (Roadmap vs Satellite)
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newTileUrl =
      mapType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    const newLayer = L.tileLayer(newTileUrl, {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Function to pan map to new lat/lng and update marker
  const panToLocation = (lat: number, lng: number, zoomLevel = 16) => {
    setSelectedLat(lat);
    setSelectedLng(lng);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoomLevel);
      markerRef.current.setLatLng([lat, lng]);

      const createPinIcon = (la: number, ln: number) =>
        L.divIcon({
          className: 'custom-gps-marker',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); pointer-events:none;">
              <div style="background:rgba(15, 23, 42, 0.95); color:#ffffff; font-size:11px; font-weight:bold; font-family:monospace; padding:3px 8px; border-radius:6px; border:1px solid #475569; white-space:nowrap; box-shadow:0 6px 16px rgba(0,0,0,0.4); margin-bottom:2px;">
                ${la.toFixed(6)}, ${ln.toFixed(6)}
              </div>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#e11d48" stroke="#ffffff" stroke-width="1.8" style="filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.5));">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3" fill="#ffffff"/>
              </svg>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

      markerRef.current.setIcon(createPinIcon(lat, lng));
    }
  };

  // Get Device Geolocation
  const handleGetDeviceGps = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ Geolocation.');
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsGeolocating(false);
        panToLocation(pos.coords.latitude, pos.coords.longitude, 17);
      },
      err => {
        setIsGeolocating(false);
        alert(`Không thể lấy vị trí thiết bị (${err.message}). Vui lòng cấp quyền vị trí.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle Search Location with Geocoding API Support
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressSearch.trim()) return;

    // Check if user entered "lat, lng" format
    const coordParts = addressSearch.split(',').map(s => parseFloat(s.trim()));
    if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
      panToLocation(coordParts[0], coordParts[1]);
      return;
    }

    // Quick search preset locations in Vietnam
    const searchLower = addressSearch.toLowerCase();
    if (searchLower.includes('ba gia') || searchLower.includes('quảng ngãi') || searchLower.includes('quang ngai')) {
      panToLocation(15.172233, 108.667440, 16);
      return;
    } else if (searchLower.includes('hà nội') || searchLower.includes('ha noi')) {
      panToLocation(21.028511, 105.854444);
      return;
    } else if (searchLower.includes('hồ chí minh') || searchLower.includes('sg') || searchLower.includes('tphcm')) {
      panToLocation(10.776889, 106.700806);
      return;
    } else if (searchLower.includes('đà nẵng') || searchLower.includes('da nang')) {
      panToLocation(16.047079, 108.20623);
      return;
    } else if (searchLower.includes('bắc giang') || searchLower.includes('bac giang')) {
      panToLocation(21.273068, 106.194602);
      return;
    }

    // Free text geocoding via OpenStreetMap Nominatim API
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          addressSearch.trim()
        )}`
      );
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          panToLocation(lat, lon, 16);
          return;
        }
      }
      alert(`Không tìm thấy vị trí cho từ khóa "${addressSearch}". Vui lòng kiểm tra lại tên địa điểm hoặc nhập tọa độ dạng lat, lng.`);
    } catch (err) {
      console.warn('Geocoding search failed:', err);
      alert('Không thể kết nối dịch vụ định vị. Vui lòng kiểm tra kết nối mạng.');
    }
  };

  const handleConfirmClick = () => {
    const coordsFormatted = `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`;
    onConfirm(coordsFormatted, selectedLat, selectedLng);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Full-Screen Container Layout */}
      <div className="bg-white rounded-2xl w-full h-full max-w-[98vw] max-h-[96vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative">
        
        {/* Top Minimal Compact Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-white tracking-wide">{title}</h3>
              {userNameOrContext && (
                <span className="text-xs bg-indigo-950/80 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-700/50 font-medium">
                  {userNameOrContext}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Ẩn/Hiện hướng dẫn thao tác"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Hướng dẫn</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white font-bold flex items-center justify-center cursor-pointer transition-all shadow-sm"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Collapsible Top Guide Banner */}
        {showGuide && (
          <div className="bg-indigo-950/90 text-indigo-100 text-xs px-4 py-2 border-b border-indigo-900 flex items-center justify-between gap-2 shrink-0 z-20 animate-fade-in">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Hướng dẫn:</strong> Nhấp vào bất kỳ điểm nào trên bản đồ để ghim vị trí. Sử dụng phím cuộn chuột hoặc <strong>+ / -</strong> để thu phóng.
              </span>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-indigo-300 hover:text-white text-xs font-bold cursor-pointer"
            >
              Đã hiểu ✕
            </button>
          </div>
        )}

        {/* Main Full-Bleed Interactive Map Canvas */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-900">
          <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

          {/* TOP-LEFT OVERLAY: Floating Layer Switcher & Search Toggle */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            {/* Map Type Switcher Buttons */}
            <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200 text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setMapType('roadmap')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  mapType === 'roadmap'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>🗺️ Mặc định</span>
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  mapType === 'satellite'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>🛰️ Vệ tinh</span>
              </button>
            </div>

            {/* Collapsible Search Toggle Button */}
            <button
              type="button"
              onClick={() => setShowTools(!showTools)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg border transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md w-fit ${
                showTools
                  ? 'bg-slate-900 text-white border-slate-700'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showTools ? 'Ẩn công cụ tìm kiếm' : '🔍 Tìm địa điểm & chọn nhanh'}</span>
            </button>

            {/* Expandable Search & Quick Places Drawer Panel */}
            {showTools && (
              <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-200 text-xs space-y-2.5 max-w-sm animate-scale-up z-20">
                <form onSubmit={handleSearch} className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Nhập địa điểm hoặc lat, lng..."
                      value={addressSearch}
                      onChange={e => setAddressSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shrink-0"
                  >
                    Tìm
                  </button>
                </form>

                <div>
                  <span className="text-slate-500 font-semibold block mb-1 text-[11px]">Chọn nhanh địa điểm:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => panToLocation(15.172233, 108.667440, 16)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 cursor-pointer"
                    >
                      📍 THPT Ba Gia (Q.Ngãi)
                    </button>
                    <button
                      type="button"
                      onClick={() => panToLocation(21.028511, 105.854444)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                    >
                      Hà Nội
                    </button>
                    <button
                      type="button"
                      onClick={() => panToLocation(10.776889, 106.700806)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                    >
                      TP.HCM
                    </button>
                    <button
                      type="button"
                      onClick={() => panToLocation(16.047079, 108.20623)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                    >
                      Đà Nẵng
                    </button>
                    <button
                      type="button"
                      onClick={() => panToLocation(21.273068, 106.194602)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                    >
                      Bắc Giang
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TOP-RIGHT OVERLAY: Device GPS & Open Google Maps Tab */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleGetDeviceGps}
              disabled={isGeolocating}
              className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white active:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg border border-slate-200 cursor-pointer flex items-center gap-1.5 backdrop-blur-md transition-all disabled:opacity-60"
            >
              {isGeolocating ? (
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{isGeolocating ? 'Đang định vị...' : 'Lấy GPS máy'}</span>
            </button>

            <a
              href={`https://www.google.com/maps?q=${selectedLat},${selectedLng}&t=${
                mapType === 'satellite' ? 'k' : 'm'
              }`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
              title="Mở trong tab Google Maps riêng"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở Google Maps</span>
            </a>
          </div>

          {/* LEFT FLOATING ZOOM CONTROLS */}
          <div className="absolute bottom-20 left-3 z-10 flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="p-2.5 hover:bg-slate-100 text-slate-800 font-bold border-b border-slate-200 cursor-pointer transition-colors"
              title="Phóng to (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="p-2.5 hover:bg-slate-100 text-slate-800 font-bold cursor-pointer transition-colors"
              title="Thu nhỏ (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* BOTTOM FLOATING ACTION & COORDINATES BAR */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-3 flex-wrap p-3 bg-slate-900/90 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
                  Tọa độ GPS đã ghim:
                </span>
                <span className="font-mono font-black text-sm text-indigo-300">
                  {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClick}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg flex items-center gap-2 cursor-pointer transition-all border border-indigo-400/30"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận lấy tọa độ GPS</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

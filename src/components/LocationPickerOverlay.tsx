import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, MapPin } from 'lucide-react';

export type LocationCoordinate = { lat: number; lng: number };
export type LocationEditMode = 'pickup' | 'destination';

interface LocationPickerOverlayProps {
  mode: LocationEditMode;
  initialCoordinate: LocationCoordinate;
  initialAddress: string;
  onConfirm: (coordinate: LocationCoordinate, address: string) => void;
  onCancel: () => void;
  onAddressChange?: (address: string) => void;
}

export function LocationPickerOverlay({
  mode,
  initialCoordinate,
  initialAddress,
  onConfirm,
  onCancel,
  onAddressChange,
}: LocationPickerOverlayProps) {
  const [address, setAddress] = useState(initialAddress);

  useEffect(() => setAddress(initialAddress), [initialAddress]);

  const label = mode === 'pickup' ? 'pickup' : 'destination';

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <div className="pointer-events-auto absolute left-4 right-4 top-4 flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-xl">
        <button aria-label="Cancel location edit" onClick={onCancel} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Adjust {label}</p>
          <p className="truncate text-sm font-medium text-gray-900">Move the map to choose a new {label}</p>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="relative flex flex-col items-center">
          <div className="flex size-12 items-center justify-center rounded-full border-4 border-white bg-[#5B2EFF] shadow-lg">
            <MapPin size={22} className="text-white" fill="currentColor" />
          </div>
          <div className="h-7 w-1 rounded-full bg-[#5B2EFF] shadow-sm" />
          <div className="size-2 rounded-full bg-[#5B2EFF]" />
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Search size={20} className="shrink-0 text-[#5B2EFF]" />
          <p className="truncate text-sm font-medium text-gray-900">{address || 'Move the map to find an address'}</p>
        </div>
        <button
          className="w-full rounded-2xl bg-[#5B2EFF] px-4 py-4 text-base font-semibold text-white transition-transform active:scale-[0.98]"
          onClick={() => onConfirm(initialCoordinate, address)}
        >
          Confirm {label}
        </button>
      </div>
    </div>
  );
}

export function formatCoordinateAddress(coordinate: LocationCoordinate) {
  return `${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}`;
}


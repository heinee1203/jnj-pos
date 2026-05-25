"use client";

// Supplier detail drawer stub — original AP suppliers page was removed

interface SupplierDetailDrawerProps {
  supplierId: string;
  token: string;
  locationId: string;
  canEdit?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SupplierDetailDrawer({
  onClose,
}: SupplierDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-[480px] bg-white dark:bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-slate-500">Supplier details not available.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

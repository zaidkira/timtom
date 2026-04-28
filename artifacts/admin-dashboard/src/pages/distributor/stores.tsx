import { useState } from "react";
import { useGetStores, Store } from "@workspace/api-client-react";
import { MapPin, Phone, Search, Store as StoreIcon } from "lucide-react";

export default function DistributorStores() {
  const { data: stores = [], isLoading } = useGetStores();
  const [search, setSearch] = useState("");

  const filtered = stores.filter((s: Store) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    (s.address || "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div dir="rtl" className="space-y-4 pt-4 pb-24">
      <h2 className="text-2xl font-display font-bold px-2">قائمة المحلات</h2>

      {/* Search */}
      <div className="relative px-2">
        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن محل..."
          className="w-full pr-10 pl-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none focus:border-primary text-sm"
        />
      </div>

      {/* Count */}
      <p className="text-sm text-slate-500 px-2">{filtered.length} محل</p>

      {/* Store Cards */}
      <div className="space-y-3 px-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100">
            <StoreIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">لا توجد نتائج</p>
          </div>
        ) : (
          filtered.map((store: Store) => (
            <div key={store.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex gap-4 items-start">
              {/* Image */}
              {store.imageUrl ? (
                <img
                  src={store.imageUrl}
                  alt={store.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0">
                  {store.name[0]}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 truncate">{store.name}</h3>
                <p className="text-sm text-slate-500 mb-2">{store.ownerName}</p>

                {store.address && (
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {store.address}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    {store.phone}
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    الموقع
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

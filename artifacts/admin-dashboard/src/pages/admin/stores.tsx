import { useState, useEffect, useRef } from "react";
import { useGetStores, useCreateStore, useUpdateStore, useDeleteStore, Store, useGetStoreGroups, useCreateStoreGroup, useUpdateStoreGroup, useDeleteStoreGroup, StoreGroup } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Plus, Edit2, MapPin, Store as StoreIcon, Trash2, Folder, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function Stores() {
  const { data: stores, isLoading } = useGetStores();
  const { data: groups } = useGetStoreGroups();
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteStoreMutation = useDeleteStore();

  const handleDeleteStore = (store: Store) => {
    const confirmed = window.confirm(`Delete store "${store.name}"? This cannot be undone.`);
    if (!confirmed) return;

    deleteStoreMutation.mutate(
      { id: store.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
          toast({ title: "Store deleted successfully" });
        },
        onError: (error: any) => {
          const message =
            error?.message || "Could not delete store. It may have related tasks or deliveries.";
          toast({ title: message, variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-display font-bold">إدارة المحلات</h1>
          <p className="text-slate-500 text-sm sm:text-base">سجل المحلات التجارية ومواقعها وديونها</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsGroupsOpen(true)}
            className="flex-1 sm:flex-none bg-slate-100 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
          >
            <Folder className="w-5 h-5" />
            المجموعات
          </button>
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 sm:flex-none bg-primary text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5" />
            إضافة محل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores?.map((store) => (
          <div key={store.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {store.imageUrl ? (
                  <img 
                    src={store.imageUrl} 
                    alt={store.name} 
                    onClick={() => setZoomedImage(store.imageUrl || null)}
                    className="w-12 h-12 rounded-xl object-cover cursor-zoom-in hover:scale-105 transition-transform" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    <StoreIcon className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{store.name}</h3>
                  <p className="text-sm text-slate-500">
                    {store.ownerName} 
                    {groups?.find(g => g.id === store.groupId) && ` • ${groups.find(g => g.id === store.groupId)?.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditingStore(store)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteStore(store)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  disabled={deleteStoreMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3 mt-4 bg-slate-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold w-16">الهاتف:</span>
                <span dir="ltr">{store.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold w-16">الديون:</span>
                <span className="font-bold text-rose-600">{formatCurrency(store.debt)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold w-16">الزيارات:</span>
                <span>{store.totalVisits}</span>
              </div>
              {store.lastVisit && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-semibold w-16">الزيارة:</span>
                  <span>{formatDate(store.lastVisit)}</span>
                </div>
              )}
            </div>

            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`} 
              target="_blank" 
              rel="noreferrer"
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-semibold text-sm"
            >
              <MapPin className="w-4 h-4" />
              عرض على الخريطة
            </a>
          </div>
        ))}
      </div>

      <StoreModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} groups={groups} />
      {editingStore && <StoreModal store={editingStore} isOpen={true} onClose={() => setEditingStore(null)} groups={groups} />}
      <StoreGroupsModal isOpen={isGroupsOpen} onClose={() => setIsGroupsOpen(false)} groups={groups} />

      {/* Lightbox Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <img 
              src={zoomedImage} 
              alt="Zoomed Store" 
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl"
            />
            <button 
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg font-bold text-xl hover:bg-slate-100 transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationPicker({ pos, setPos }: { pos: [number, number], setPos: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPos([e.latlng.lat, e.latlng.lng]);
    },
  });
  return <Marker position={pos} />;
}

function MapRecenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos);
  }, [pos, map]);
  return null;
}

function StoreModal({ store, isOpen, onClose, groups }: { store?: Store, isOpen: boolean, onClose: () => void, groups?: StoreGroup[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateStore();
  const updateMutation = useUpdateStore();
  
  // Default to Algiers center
  const [position, setPosition] = useState<[number, number]>(
    store ? [store.latitude, store.longitude] : [36.7525, 3.04197]
  );
  
  const [photoBase64, setPhotoBase64] = useState<string>(store?.imageUrl || "");

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoBase64(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name') as string,
      ownerName: fd.get('ownerName') as string,
      phone: fd.get('phone') as string,
      address: fd.get('address') as string,
      imageUrl: photoBase64,
      latitude: position[0],
      longitude: position[1],
      groupId: fd.get('groupId') ? parseInt(fd.get('groupId') as string, 10) : undefined,
    };
    
    if (store) {
      updateMutation.mutate({ id: store.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
          toast({ title: "تم التعديل بنجاح" });
          onClose();
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
          toast({ title: "تم الإضافة بنجاح" });
          onClose();
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={store ? "تعديل المحل" : "إضافة محل جديد"} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم المحل</label>
            <input name="name" defaultValue={store?.name} required className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم المالك</label>
            <input name="ownerName" defaultValue={store?.ownerName} required className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">رقم الهاتف</label>
            <input name="phone" dir="ltr" defaultValue={store?.phone} required className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary outline-none text-right" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">العنوان (اختياري)</label>
            <input name="address" defaultValue={store?.address || ''} className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">المجموعة</label>
            <select name="groupId" defaultValue={store?.groupId || ''} className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary outline-none bg-white">
              <option value="">بدون مجموعة</option>
              {groups?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            صورة المحل (اختياري)
          </label>
          <label className="w-full h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden">
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            {photoBase64 ? (
              <img src={photoBase64} alt="صورة المحل" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <Edit2 className="w-8 h-8 mb-2" />
                <span className="text-xs">اضغط لاختيار صورة للمحل</span>
              </>
            )}
          </label>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold">موقع المحل على الخريطة</label>
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!navigator.geolocation) {
                  toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
                  return;
                }
                const btn = document.getElementById('get-admin-loc');
                if (btn) btn.innerText = "جارٍ التحديد...";
                
                // Median.co specific: Prompt for Android permission via Bridge
                if (typeof (window as any).median !== 'undefined' && (window as any).median.android) {
                  (window as any).median.android.geoLocation.promptLocationServices();
                }

                const options = {
                  enableHighAccuracy: true,
                  timeout: 20000,
                  maximumAge: 0
                };

                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setPosition([pos.coords.latitude, pos.coords.longitude]);
                    toast({ title: "تم تحديد موقعك بنجاح" });
                    if (btn) btn.innerText = "استخدام موقعي الحالي";
                  },
                  (err) => {
                    console.warn("Geolocation primary error (will fallback):", err);
                    // Fallback to lower accuracy
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setPosition([pos.coords.latitude, pos.coords.longitude]);
                        toast({ title: "تم تحديد الموقع (دقة عادية)" });
                        if (btn) btn.innerText = "استخدام موقعي الحالي";
                      },
                      (err2) => {
                        console.error("Geolocation fallback error:", err2);
                        let errMsg = "فشل تحديد الموقع";
                        let desc = "تأكد من تفعيل GPS في الهاتف والموافقة على الصلاحيات.";
                        
                        if (err2.code === 1) {
                          errMsg = "تم رفض الصلاحية";
                          desc = "يجب السماح للمتصفح بالوصول للموقع من إعدادات الهاتف.";
                          
                          if (typeof (window as any).median !== 'undefined') {
                            toast({ 
                              title: errMsg, 
                              description: (
                                <div className="space-y-2">
                                  <p>{desc}</p>
                                  <button 
                                    type="button"
                                    onClick={() => (window as any).median.open.appSettings()}
                                    className="bg-white text-rose-600 px-3 py-1 rounded-lg text-xs font-bold shadow-sm"
                                  >
                                    افتح إعدادات الهاتف
                                  </button>
                                </div>
                              ), 
                              variant: "destructive" 
                            });
                            if (btn) btn.innerText = "استخدام موقعي الحالي";
                            return;
                          }
                        } else if (err2.code === 3) {
                          errMsg = "انتهى وقت الطلب";
                          desc = "تأكد من وجود إشارة GPS جيدة (مكان مفتوح).";
                        }
                        
                        toast({ title: errMsg, description: desc, variant: "destructive" });
                        if (btn) btn.innerText = "استخدام موقعي الحالي";
                      },
                      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
                    );
                  },
                  options
                );
              }}
              id="get-admin-loc"
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
              role="button"
            >
              <MapPin className="w-3 h-3" />
              استخدام موقعي الحالي
            </div>
          </div>

          {/* Address Search */}
          <div className="flex gap-2">
            <input 
              id="address-search-input"
              type="text" 
              placeholder="ابحث عن عنوان أو منطقة..." 
              className="flex-1 p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value;
                  if (val) {
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`)
                      .then(r => r.json())
                      .then(data => {
                        if (data && data[0]) {
                          setPosition([Number(data[0].lat), Number(data[0].lon)]);
                        } else {
                          toast({ title: "لم يتم العثور على العنوان", variant: "destructive" });
                        }
                      });
                  }
                }
              }}
            />
            <button 
              type="button"
              onClick={() => {
                const input = document.getElementById('address-search-input') as HTMLInputElement;
                const val = input.value;
                if (val) {
                  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`)
                    .then(r => r.json())
                    .then(data => {
                      if (data && data[0]) {
                        setPosition([Number(data[0].lat), Number(data[0].lon)]);
                      } else {
                        toast({ title: "لم يتم العثور على العنوان", variant: "destructive" });
                      }
                    });
                }
              }}
              className="bg-slate-100 p-2 rounded-lg text-xs font-bold hover:bg-slate-200"
            >
              بحث
            </button>
          </div>

          <div className="h-64 rounded-xl overflow-hidden border border-slate-200 relative">
            <MapContainer center={position} zoom={13} scrollWheelZoom={true} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker pos={position} setPos={setPosition} />
              <MapRecenter pos={position} />
            </MapContainer>
          </div>
          <p className="text-xs text-slate-500">اضغط على الخريطة لتحديد الموقع أو استخدم زر التحديد التلقائي</p>
        </div>

        <button disabled={isPending} className="w-full bg-primary text-white p-3 rounded-xl font-bold hover:bg-primary/90 mt-4 disabled:opacity-50">
          {store ? "حفظ التعديلات" : "إضافة المحل"}
        </button>
      </form>
    </Modal>
  );
}

function StoreGroupsModal({ isOpen, onClose, groups }: { isOpen: boolean, onClose: () => void, groups?: StoreGroup[] }) {
  const createMutation = useCreateStoreGroup();
  const updateMutation = useUpdateStoreGroup();
  const deleteMutation = useDeleteStoreGroup();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const { toast } = useToast();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    if (!name) return;

    createMutation.mutate({ data: { name } }, {
      onSuccess: () => {
        toast({ title: "تم الإضافة بنجاح" });
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  const handleUpdate = (id: number) => {
    if (!editName) return;
    updateMutation.mutate({ id, data: { name: editName } }, {
      onSuccess: () => {
        toast({ title: "تم التعديل بنجاح" });
        setEditingId(null);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المجموعة؟")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "تم الحذف بنجاح" });
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة المجموعات" className="max-w-xl">
      <div className="space-y-6">
        <form onSubmit={handleCreate} className="flex gap-2">
          <input 
            name="name" 
            placeholder="اسم المجموعة الجديدة..." 
            required 
            className="flex-1 p-3 rounded-xl border border-slate-200 focus:border-primary outline-none" 
          />
          <button 
            disabled={createMutation.isPending}
            className="bg-primary text-white px-6 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            إضافة
          </button>
        </form>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {groups?.length === 0 && (
            <p className="text-center text-slate-500 py-4">لا توجد مجموعات حالياً</p>
          )}
          {groups?.map(g => (
            <div key={g.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
              {editingId === g.id ? (
                <div className="flex flex-1 gap-2 mr-2">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-slate-200 outline-none"
                  />
                  <button onClick={() => handleUpdate(g.id)} className="text-primary hover:bg-primary/10 p-2 rounded-lg">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-500 hover:bg-slate-200 p-2 rounded-lg text-sm font-bold">
                    إلغاء
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-bold text-slate-700">{g.name}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.name);
                      }} 
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(g.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

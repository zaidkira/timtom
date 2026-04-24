import { useGetTasks, useUpdateTask, useCreateDelivery } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Navigation, Camera, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function DistributorTasks() {
  const { user } = useAuth();
  const { data: tasks, isLoading } = useGetTasks({ distributorId: user?.id });
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        console.error("Location error:", err);
        setLocationError("يرجى تفعيل الموقع الجغرافي لترتيب المهام حسب المسافة");
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (isLoading) return <div className="p-8 text-center">جارٍ التحميل...</div>;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const pendingTasks = (tasks?.filter((t: any) => t.status === "pending" || t.status === "in_progress") || [])
    .map((t: any) => {
      const dist = location ? calculateDistance(location.lat, location.lng, t.storeLatitude, t.storeLongitude) : 999999;
      return { ...t, distance: dist };
    })
    .sort((a: any, b: any) => a.distance - b.distance);

  const completedTasks = tasks?.filter((t: any) => t.status === "completed" || t.status === "failed") || [];

  return (
    <div dir="rtl" className="space-y-6 pt-4 pb-24">
      <h2 className="text-2xl font-display font-bold px-2">المهام الحالية</h2>

      {locationError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 mx-2">
          <Navigation className="w-4 h-4 animate-pulse" />
          {locationError}
        </div>
      )}

      {pendingTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="font-bold text-xl mb-2">عمل رائع!</h3>
          <p className="text-slate-500">لقد أنهيت جميع مهامك لهذا اليوم.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTasks.map((task: any) => (
            <div key={task.id} className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-2 h-full ${task.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"}`} />

              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-4">
                  {task.storeImageUrl ? (
                    <img src={task.storeImageUrl} alt={task.storeName} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shadow-inner">
                      {task.storeName[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-xl text-slate-900">{task.storeName}</h3>
                    {location && (
                      <p className="text-xs text-slate-500 font-medium">تبعد {task.distance.toFixed(1)} كلم</p>
                    )}
                  </div>
                </div>
                <Badge variant={task.status === "in_progress" ? "outline" : "secondary"} className="text-[10px]">
                  {task.status === "in_progress" ? "جاري التنفيذ" : "قيد الانتظار"}
                </Badge>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="text-sm font-bold text-slate-700 mb-2 border-b border-slate-200 pb-2">الطلبية:</p>
                <ul className="space-y-1">
                  {task.items.map((item: any, i: number) => (
                    <li key={i} className="text-sm flex justify-between">
                      <span>{item.productName}</span>
                      <span className="font-bold bg-slate-200 px-2 rounded">{item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-500">المبلغ المطلوب تحصيله</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(task.totalAmount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${task.storeLatitude},${task.storeLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  المسار
                </a>
                <button
                  onClick={() => setSelectedTask(task)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-primary/30 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  تسليم
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-lg text-slate-800 px-2 mb-4">مهام سابقة</h3>
          <div className="space-y-3">
            {completedTasks.map((task: any) => (
              <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center opacity-70">
                <div>
                  <h4 className="font-bold text-slate-900">{task.storeName}</h4>
                  <p className="text-xs text-slate-500">{formatCurrency(task.totalAmount)}</p>
                </div>
                <Badge variant={task.status === "completed" ? "success" : "destructive"}>
                  {task.status === "completed" ? "مكتملة" : "فشلت"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTask && <DeliveryModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}

function DeliveryModal({ task, onClose }: { task: any, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deliveryMutation = useCreateDelivery();
  const updateTaskMutation = useUpdateTask();

  const [amountCollected, setAmountCollected] = useState(task.totalAmount.toString());
  const [photoBase64, setPhotoBase64] = useState<string>("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use a single mutation for better reliability if possible, or ensure sequential execution
    deliveryMutation.mutate({
      data: {
        taskId: task.id,
        amountCollected: Number(amountCollected),
        latitude: Number(task.storeLatitude),
        longitude: Number(task.storeLongitude),
        photoUrl: photoBase64 || "https://images.unsplash.com/photo-1620803554446-4131ee68ea82?w=400&h=300&fit=crop"
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/map/locations"] });
        toast({ title: "تم تسجيل التسليم بنجاح" });
        onClose();
      },
      onError: () => {
        toast({ title: "خطأ في تسجيل التسليم", variant: "destructive" });
      }
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="تأكيد التسليم">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 mb-6 p-2 bg-slate-50 rounded-2xl">
          {task.storeImageUrl ? (
            <img src={task.storeImageUrl} alt={task.storeName} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
              {task.storeName[0]}
            </div>
          )}
          <div>
            <h4 className="font-bold text-lg text-slate-900">{task.storeName}</h4>
            <p className="text-sm text-slate-500">تأكيد استلام المبلغ</p>
          </div>
        </div>

        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-center mb-6">
          <p className="text-sm font-semibold mb-1">المبلغ الإجمالي للمهمة</p>
          <p className="text-3xl font-bold">{formatCurrency(task.totalAmount)}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold block">المبلغ المحصل فعلياً</label>
          <input
            type="number"
            value={amountCollected}
            onChange={e => setAmountCollected(e.target.value)}
            required
            className="w-full p-4 text-xl rounded-xl border-2 border-slate-200 focus:border-primary text-center font-bold outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold block">صورة الإيصال أو التسليم (اختياري)</label>
          <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden relative">
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            {photoBase64 ? (
              <img src={photoBase64} alt="صورة التسليم" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <Camera className="w-8 h-8 mb-2" />
                <span className="text-sm font-semibold">اضغط لالتقاط صورة</span>
              </>
            )}
          </label>
        </div>

        <button disabled={deliveryMutation.isPending || updateTaskMutation.isPending} className="w-full bg-primary text-white p-4 rounded-xl font-bold text-lg hover:bg-primary/90 mt-6 shadow-lg shadow-primary/25 disabled:opacity-50">
          تأكيد التسليم
        </button>
      </form>
    </Modal>
  );
}

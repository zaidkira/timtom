import { useState } from "react";
import { useCreateStoreSuggestion } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Store, User, MapPin, Phone, Camera } from "lucide-react";

export default function SuggestStore() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createMutation = useCreateStoreSuggestion();
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        toast({ title: "تم تحديد الموقع بنجاح" });
      },
      () => {
        setIsLocating(false);
        toast({ title: "فشل تحديد الموقع", variant: "destructive" });
      }
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (!coords) {
      toast({ title: "يرجى تحديد الموقع الجغرافي قبل إرسال الاقتراح", variant: "destructive" });
      return;
    }

    const data = {
      name: fd.get("name") as string,
      ownerName: fd.get("ownerName") as string,
      phone: fd.get("phone") as string,
      address: fd.get("address") as string,
      latitude: coords.lat,
      longitude: coords.lng,
      photoUrl: photoBase64,
    };

    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "تم إرسال الاقتراح بنجاح", description: "سيقوم المدير بمراجعته وإضافته إلى النظام." });
        setLocation("/distributor");
      }
    });
  };

  return (
    <div dir="rtl" className="space-y-6 pb-10">
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">إضافة محل جديد</h1>
        <p className="text-slate-500 text-sm">أرسل اقتراحاً لمحل جديد ليقوم المدير بمراجعته واعتماده ضمن خطة التوزيع.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              اسم المحل
            </label>
            <input name="name" required className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20 text-lg" placeholder="مثال: بقالة التوفيق" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              اسم صاحب المحل (اختياري)
            </label>
            <input name="ownerName" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20" placeholder="مثال: السيد محمد" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              رقم الهاتف
            </label>
            <input name="phone" type="tel" required className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20" placeholder="0555 00 00 00" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              العنوان / الموقع
            </label>
            <textarea name="address" rows={2} required className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20" placeholder="اكتب عنوان المحل بالتفصيل..." />

            <div
              onClick={(e) => {
                e.preventDefault();
                if (!isLocating) handleGetLocation();
              }}
              className={`w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all cursor-pointer ${coords ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-500 hover:border-primary/40"}`}
              role="button"
            >
              <MapPin className={`w-5 h-5 ${isLocating ? "animate-bounce" : ""}`} />
              {isLocating ? "جارٍ تحديد الموقع..." : coords ? "تم تحديد الموقع الجغرافي" : "اضغط هنا لتحديد موقعك الحالي"}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              صورة المحل (اختياري)
            </label>
            <label className="w-full h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden">
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              {photoBase64 ? (
                <img src={photoBase64} alt="صورة المحل" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-xs">اضغط لالتقاط أو اختيار صورة</span>
                </>
              )}
            </label>
          </div>
        </div>

        <button
          disabled={createMutation.isPending}
          className="w-full bg-primary text-white p-5 rounded-3xl font-bold text-xl shadow-xl shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
        >
          {createMutation.isPending ? "جارٍ الإرسال..." : "إرسال الاقتراح للمدير"}
        </button>
      </form>
    </div>
  );
}

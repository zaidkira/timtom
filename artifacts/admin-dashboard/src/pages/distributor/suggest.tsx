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
      toast({ title: "Ø§Ù„Ù…ØªØµÙØ­ Ù„Ø§ ÙŠØ¯Ø¹Ù… ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹", variant: "destructive" });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        toast({ title: "ØªÙ… Ø§Ù„ØªÙ‚Ø§Ø· Ø¥Ø­Ø¯Ø§Ø«ÙŠØ§Øª Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø¨Ù†Ø¬Ø§Ø­" });
      },
      () => {
        setIsLocating(false);
        toast({ title: "ÙØ´Ù„ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹", variant: "destructive" });
      }
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (!coords) {
      toast({ title: "ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¬ØºØ±Ø§ÙÙŠ Ù‚Ø¨Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø§Ù‚ØªØ±Ø§Ø­", variant: "destructive" });
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
        toast({ title: "ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø§Ù‚ØªØ±Ø§Ø­ Ø¨Ù†Ø¬Ø§Ø­", description: "Ø³ÙŠÙ‚ÙˆÙ… Ø§Ù„Ù…Ø¯ÙŠØ± Ø¨Ù…Ø±Ø§Ø¬Ø¹ØªÙ‡ ÙˆØ¥Ø¶Ø§ÙØªÙ‡ Ù„Ù„Ù†Ø¸Ø§Ù…." });
        setLocation("/distributor");
      }
    });
  };

  return (
    <div dir="rtl" className="space-y-6 pb-10">
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Ø¥Ø¶Ø§ÙØ© Ù…Ø­Ù„ Ø¬Ø¯ÙŠØ¯</h1>
        <p className="text-slate-500 text-sm">Ø£Ø±Ø³Ù„ Ø§Ù‚ØªØ±Ø§Ø­Ø§Ù‹ Ù„Ù…Ø­Ù„ Ø¬Ø¯ÙŠØ¯ Ù„Ù„Ù…Ø¯ÙŠØ± Ù„ÙŠØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯Ù‡ ÙÙŠ Ø®Ø·Ø© Ø§Ù„ØªÙˆØ²ÙŠØ¹.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Ø§Ø³Ù… Ø§Ù„Ù…Ø­Ù„
            </label>
            <input name="name" required className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20 text-lg" placeholder="Ù…Ø«Ø§Ù„: Ø¨Ù‚Ø§Ù„Ø© Ø§Ù„ØªÙˆÙÙŠÙ‚" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Ø§Ø³Ù… ØµØ§Ø­Ø¨ Ø§Ù„Ù…Ø­Ù„ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
            </label>
            <input name="ownerName" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ù…Ø«Ø§Ù„: Ø§Ù„Ø³ÙŠØ¯ Ù…Ø­Ù…Ø¯" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ
            </label>
            <input name="phone" type="tel" required className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20" placeholder="0555 00 00 00" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Ø§Ù„Ø¹Ù†ÙˆØ§Ù† / Ø§Ù„Ù…ÙˆÙ‚Ø¹
            </label>
            <textarea name="address" rows={2} required className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ø§ÙƒØªØ¨ Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ù…Ø­Ù„ Ø¨Ø§Ù„ØªÙØµÙŠÙ„..." />

            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              className={`w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${coords ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-500 hover:border-primary/40"}`}
            >
              <MapPin className={`w-5 h-5 ${isLocating ? "animate-bounce" : ""}`} />
              {isLocating ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ¯..." : coords ? "ØªÙ… ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¬ØºØ±Ø§ÙÙŠ âœ…" : "Ø§Ø¶ØºØ· Ù‡Ù†Ø§ Ù„ØªØ­Ø¯ÙŠØ¯ Ù…ÙˆÙ‚Ø¹Ùƒ Ø§Ù„Ø­Ø§Ù„ÙŠ"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              ØµÙˆØ±Ø© Ø§Ù„Ù…Ø­Ù„ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
            </label>
            <label className="w-full h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden">
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              {photoBase64 ? (
                <img src={photoBase64} alt="ØªÙ… Ø§Ù„ØªÙ‚Ø§Ø· Ø§Ù„ØµÙˆØ±Ø©" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-xs">Ø§Ø¶ØºØ· Ù„Ø§Ù„ØªÙ‚Ø§Ø· Ø£Ùˆ Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø©</span>
                </>
              )}
            </label>
          </div>
        </div>

        <button
          disabled={createMutation.isPending}
          className="w-full bg-primary text-white p-5 rounded-3xl font-bold text-xl shadow-xl shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
        >
          {createMutation.isPending ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„..." : "Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø§Ù‚ØªØ±Ø§Ø­ Ù„Ù„Ù…Ø¯ÙŠØ±"}
        </button>
      </form>
    </div>
  );
}

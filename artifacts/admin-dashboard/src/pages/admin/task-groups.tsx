import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetDistributors, useGetStores } from "@workspace/api-client-react";
import { Modal } from "@/components/ui/modal";
import { Plus, ListTodo, Trash2, Calendar, Users, Store, Play, ChevronDown, ChevronUp, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskGroupStore {
  id: number;
  name: string;
  imageUrl?: string | null;
}

interface TaskGroup {
  id: number;
  name: string;
  distributorId: number;
  distributorName: string;
  storeIds: number[];
  stores: TaskGroupStore[];
  recurrence: "none" | "weekly";
  daysOfWeek: number[];
  createdAt: string;
}

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-slate-100 text-slate-700",
];

export default function TaskGroups() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery<TaskGroup[]>({
    queryKey: ["/api/task-groups"],
    queryFn: async () => {
      const res = await fetch("/api/task-groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task groups");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/task-groups/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-groups"] });
      toast({ title: "تم حذف المجموعة بنجاح" });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/task-groups/${id}/trigger`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to trigger");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: data.message });
    },
    onError: () => {
      toast({ title: "فشل توليد المهام", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-display font-bold">مجموعات المهام المتكررة</h1>
          <p className="text-slate-500 mt-1">إنشاء مجموعات مهام تتولّد تلقائياً كل أسبوع</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          إنشاء مجموعة
        </button>
      </div>

      {/* Groups list */}
      <div className="space-y-4">
        {groups?.map((group) => (
          <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Group header */}
            <div className="p-6 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-primary flex-shrink-0" />
                    {group.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {group.distributorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Store className="w-4 h-4" />
                    {group.storeIds.length} محلات
                  </span>
                  <span className="flex items-center gap-1 flex-wrap gap-y-1">
                    <Calendar className="w-4 h-4" />
                    {group.daysOfWeek?.map((d) => (
                      <span key={d} className={`text-xs px-2 py-0.5 rounded-full font-bold ${DAY_COLORS[d]}`}>
                        {DAYS[d]}
                      </span>
                    ))}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => triggerMutation.mutate(group.id)}
                  disabled={triggerMutation.isPending}
                  title="توليد المهام الآن"
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  توليد الآن
                </button>
                <button
                  onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  {expandedGroup === group.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("هل أنت متأكد من حذف هذه المجموعة؟")) deleteMutation.mutate(group.id);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded stores */}
            {expandedGroup === group.id && (
              <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                <p className="text-sm font-bold text-slate-700 mb-3">المحلات المشمولة:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {group.stores.map((store) => (
                    <div key={store.id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      {store.imageUrl ? (
                        <img src={store.imageUrl} alt={store.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Image className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <span className="text-sm font-bold text-slate-700 truncate">{store.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {groups?.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">لا توجد مجموعات مهام حالياً</p>
            <p className="text-sm mt-1">أنشئ مجموعة لبدء التوزيع الأسبوعي التلقائي</p>
          </div>
        )}
      </div>

      {isCreateOpen && <CreateGroupModal onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: distributors } = useGetDistributors();
  const { data: stores } = useGetStores();

  const [name, setName] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday default

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/task-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create task group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-groups"] });
      toast({ title: "تم إنشاء المجموعة بنجاح" });
      onClose();
    },
    onError: () => {
      toast({ title: "فشل إنشاء المجموعة", variant: "destructive" });
    },
  });

  const toggleStore = (id: number) => {
    setSelectedStores((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !distributorId || selectedStores.length === 0 || selectedDays.length === 0) {
      toast({ title: "الرجاء إكمال جميع البيانات واختيار يوم واحد على الأقل", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name,
      distributorId: Number(distributorId),
      storeIds: selectedStores,
      daysOfWeek: selectedDays,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="إنشاء مجموعة مهام متكررة" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-sm font-bold">اسم المجموعة</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: جولة منطقة الوسط"
            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-primary transition-colors"
            required
          />
        </div>

        {/* Distributor */}
        <div className="space-y-1">
          <label className="text-sm font-bold">الموزع</label>
          <select
            value={distributorId}
            onChange={(e) => setDistributorId(e.target.value)}
            required
            className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-primary"
          >
            <option value="">اختر الموزع...</option>
            {distributors?.filter((d) => d.isActive).map((d) => (
              <option key={d.id} value={d.id}>
                {d.firstName} {d.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Days of week - multi-select */}
        <div className="space-y-2">
          <label className="text-sm font-bold">أيام التكرار ({selectedDays.length} مختار)</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                  selectedDays.includes(i)
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Stores */}
        <div className="space-y-1">
          <label className="text-sm font-bold">المحلات ({selectedStores.length} مختار)</label>
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2">
            {stores?.map((store) => (
              <div
                key={store.id}
                onClick={() => toggleStore(store.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  selectedStores.includes(store.id)
                    ? "bg-primary/10 border-primary text-primary font-bold"
                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                }`}
              >
                {store.imageUrl ? (
                  <img src={store.imageUrl} alt={store.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500">
                    {store.name[0]}
                  </div>
                )}
                <span className="truncate text-sm">{store.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-primary text-white p-4 rounded-xl font-bold text-lg hover:bg-primary/90 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all"
        >
          {createMutation.isPending ? "جاري الإنشاء..." : "حفظ المجموعة"}
        </button>
      </form>
    </Modal>
  );
}

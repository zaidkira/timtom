import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetDistributors, useGetStores } from "@workspace/api-client-react";
import { Modal } from "@/components/ui/modal";
import { Plus, ListTodo, Trash2, Calendar, Users, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskGroup {
  id: number;
  name: string;
  distributorId: number;
  storeIds: number[];
  recurrence: "none" | "weekly";
  dayOfWeek: number | null;
  createdAt: string;
}

export default function TaskGroups() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery<TaskGroup[]>({
    queryKey: ["/api/task-groups"],
    queryFn: async () => {
      const res = await fetch("/api/task-groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task groups");
      return res.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/task-groups/${id}`, { 
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete task group");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-groups"] });
      toast({ title: "تم حذف المجموعة بنجاح" });
    }
  });

  if (isLoading) return <div className="p-8 text-center">جاري التحميل...</div>;

  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-display font-bold">مجموعات المهام المتكررة</h1>
          <p className="text-slate-500">إنشاء مجموعات مهام يتم توليدها تلقائياً كل أسبوع</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          إنشاء مجموعة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups?.map((group) => (
          <div key={group.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  {group.name}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                   <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    الموزع #{group.distributorId}
                  </p>
                   <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {group.recurrence === 'weekly' ? `كل ${days[group.dayOfWeek!]}` : 'لا يتكرر'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من حذف هذه المجموعة؟")) {
                    deleteMutation.mutate(group.id);
                  }
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                <Store className="w-4 h-4" />
                المحلات المشمولة ({group.storeIds.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {group.storeIds.map(id => (
                  <span key={id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    محل #{id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        {groups?.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
            لا توجد مجموعات مهام حالياً
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
  const [dayOfWeek, setDayOfWeek] = useState("1"); // Monday

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/task-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to create task group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-groups"] });
      toast({ title: "تم إنشاء المجموعة بنجاح" });
      onClose();
    }
  });

  const toggleStore = (id: number) => {
    setSelectedStores(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !distributorId || selectedStores.length === 0) {
      toast({ title: "الرجاء إكمال جميع البيانات", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      name,
      distributorId: Number(distributorId),
      storeIds: selectedStores,
      recurrence: "weekly",
      dayOfWeek: Number(dayOfWeek)
    });
  };

  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  return (
    <Modal isOpen={true} onClose={onClose} title="إنشاء مجموعة مهام متكررة" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold">اسم المجموعة</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="مثلاً: مهام يوم الاثنين - منطقة الوسط"
            className="w-full p-3 rounded-xl border border-slate-200 outline-none" 
            required 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">الموزع</label>
            <select 
              value={distributorId} 
              onChange={e => setDistributorId(e.target.value)} 
              required 
              className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none"
            >
              <option value="">اختر الموزع...</option>
              {distributors?.filter(d => d.isActive).map(d => (
                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">يوم التكرار</label>
            <select 
              value={dayOfWeek} 
              onChange={e => setDayOfWeek(e.target.value)} 
              className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none"
            >
              {days.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">اختر المحلات ( {selectedStores.length} مختارة )</label>
          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-2">
            {stores?.map(store => (
              <div 
                key={store.id} 
                onClick={() => toggleStore(store.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedStores.includes(store.id) 
                    ? "bg-primary/10 border-primary text-primary font-bold" 
                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                }`}
              >
                {store.name}
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={createMutation.isPending} 
          className="w-full bg-primary text-white p-4 rounded-xl font-bold text-lg hover:bg-primary/90 mt-4 shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          {createMutation.isPending ? "جاري الإنشاء..." : "حفظ المجموعة"}
        </button>
      </form>
    </Modal>
  );
}

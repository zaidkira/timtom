import { useState } from "react";
import { useGetTasks, useCreateTask, useGetDistributors, useGetStores, useGetProducts, TaskItem } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Plus, ListTodo, Store, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, { 
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete task");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to delete task", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="p-8 text-center">جاري التحميل...</div>;

  const statusColors = {
    pending: "warning",
    in_progress: "primary",
    completed: "success",
    failed: "destructive",
    cancelled: "secondary"
  } as const;

  const statusLabels = {
    pending: "قيد الانتظار",
    in_progress: "جاري التنفيذ",
    completed: "مكتملة",
    failed: "فشلت",
    cancelled: "ملغاة"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-display font-bold">إدارة المهام</h1>
          <p className="text-slate-500 text-sm sm:text-base">تعيين ومتابعة مهام التوصيل للموزعين</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          إنشاء مهمة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tasks?.map((task) => (
          <div key={task.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {(task as any).storeImageUrl ? (
                  <img 
                    src={(task as any).storeImageUrl} 
                    alt={task.storeName} 
                    onClick={() => setZoomedImage((task as any).storeImageUrl || null)}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 cursor-zoom-in hover:scale-105 transition-transform" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{task.storeName}</h3>
                  <p className="text-sm text-slate-500">الموزع: {task.distributorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusColors[task.status] as any}>{statusLabels[task.status]}</Badge>
                <button
                  onClick={() => {
                    const confirmed = window.confirm(`Delete task #${task.id}? This cannot be undone.`);
                    if (!confirmed) return;
                    deleteTaskMutation.mutate(task.id);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  disabled={deleteTaskMutation.isPending}
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700 mb-2">السلع المطلوبة:</p>
              <ul className="space-y-2 mb-4 bg-slate-50 rounded-xl p-3">
                {task.items.map((item, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span>{item.productName} <span className="text-slate-400 px-1">×</span> <span className="font-bold">{item.quantity}</span></span>
                    <span className="font-bold text-slate-700">{formatCurrency(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
              <div>
                <p className="text-xs text-slate-500">الإجمالي</p>
                <p className="font-bold text-lg text-emerald-600">{formatCurrency(task.totalAmount)}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500">تم الإنشاء</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(task.createdAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreateOpen && <CreateTaskModal onClose={() => setIsCreateOpen(false)} />}

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

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateTask();
  
  const { data: distributors } = useGetDistributors();
  const { data: stores } = useGetStores();
  const { data: products } = useGetProducts();

  const [distributorId, setDistributorId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState<{productId: number, quantity: number}[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedQty, setSelectedQty] = useState("1");

  const handleAddItem = () => {
    if (!selectedProduct || !selectedQty) return;
    const pid = Number(selectedProduct);
    const qty = Number(selectedQty);
    
    setItems(prev => {
      const exists = prev.find(i => i.productId === pid);
      if (exists) {
        return prev.map(i => i.productId === pid ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { productId: pid, quantity: qty }];
    });
    
    setSelectedProduct("");
    setSelectedQty("1");
  };

  const removeItem = (pid: number) => {
    setItems(prev => prev.filter(i => i.productId !== pid));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributorId || !storeId || items.length === 0) {
      toast({ title: "الرجاء إكمال جميع البيانات", variant: "destructive" });
      return;
    }

    createMutation.mutate(
      { data: { distributorId: Number(distributorId), storeId: Number(storeId), items, notes } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          toast({ title: "تم إنشاء المهمة بنجاح" });
          onClose();
        }
      }
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="إنشاء مهمة جديدة" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">الموزع</label>
            <select value={distributorId} onChange={e => setDistributorId(e.target.value)} required className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none">
              <option value="">اختر الموزع...</option>
              {distributors?.filter(d => d.isActive).map(d => (
                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">المحل</label>
            <select value={storeId} onChange={e => setStoreId(e.target.value)} required className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none">
              <option value="">اختر المحل...</option>
              {stores?.map(s => (
                <option key={s.id} value={s.id}>{s.name} - {s.ownerName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
          <h4 className="font-bold text-slate-900">السلع المطلوبة</h4>
          
          <div className="flex gap-2">
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="flex-1 p-2 rounded-lg border border-slate-200 bg-white outline-none">
              <option value="">اختر السلعة...</option>
              {products?.map(p => (
                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>{p.name} ({p.quantity} متوفر)</option>
              ))}
            </select>
            <input type="number" min="1" value={selectedQty} onChange={e => setSelectedQty(e.target.value)} className="w-20 p-2 rounded-lg border border-slate-200 outline-none text-center" />
            <button type="button" onClick={handleAddItem} className="bg-secondary text-secondary-foreground px-4 rounded-lg font-bold hover:bg-secondary/80">إضافة</button>
          </div>

          {items.length > 0 && (
            <ul className="space-y-2 mt-4">
              {items.map((item, idx) => {
                const prod = products?.find(p => p.id === item.productId);
                return (
                  <li key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <span className="font-bold">{prod?.name} <span className="text-slate-400 mx-2">×</span> {item.quantity}</span>
                    <button type="button" onClick={() => removeItem(item.productId)} className="text-rose-500 hover:bg-rose-50 p-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">ملاحظات (اختياري)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none min-h-[100px]" placeholder="ملاحظات للموزع..." />
        </div>

        <button type="submit" disabled={createMutation.isPending || items.length === 0} className="w-full bg-primary text-white p-4 rounded-xl font-bold text-lg hover:bg-primary/90 mt-4 shadow-lg shadow-primary/25 disabled:opacity-50">
          إنشاء المهمة
        </button>
      </form>
    </Modal>
  );
}

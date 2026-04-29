import { useGetDeliveries, useGetTasks } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ListTodo, Map as MapIcon, PlusCircle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function DistributorHome() {
  const { data: tasks = [] } = useGetTasks();
  const { data: deliveries = [] } = useGetDeliveries();

  const myCompletedTasks = tasks.filter((task: any) => task.status === "completed").length;
  const myCollectedAmount = deliveries
    .filter((delivery: any) => delivery.status === "confirmed" || delivery.status === "pending_admin")
    .reduce((sum: number, delivery: any) => sum + delivery.amountCollected, 0);
  const myOutstandingDebt = deliveries
    .filter((delivery: any) => delivery.status === "pending_admin")
    .reduce((sum: number, delivery: any) => sum + delivery.amountCollected, 0);

  const menuItems = [
    { title: "مهامي اليوم", icon: ListTodo, href: "/distributor/tasks", color: "bg-blue-500", shadow: "shadow-blue-500/20" },
    { title: "خريطة المحلات", icon: MapIcon, href: "/distributor/map", color: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
    { title: "اقتراح محل", icon: PlusCircle, href: "/distributor/suggest", color: "bg-orange-500", shadow: "shadow-orange-500/20" },
  ];

  return (
    <div dir="rtl" className="space-y-6 pt-4">
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center">
        <img src="/logo.png" alt="Tim & Tom" className="w-20 h-20 rounded-2xl mb-4 shadow-md" />
        <p className="text-slate-500 font-semibold mb-1">الأموال المحصلة</p>
        <h2 className="text-4xl font-display font-bold text-emerald-600 mb-6">
          {formatCurrency(myCollectedAmount)}
        </h2>

        <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
          <div>
            <p className="text-slate-400 text-sm">المهام المنجزة</p>
            <p className="font-bold text-xl text-slate-800">{myCompletedTasks}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">المبالغ بانتظار التأكيد</p>
            <p className="font-bold text-xl text-slate-800">{formatCurrency(myOutstandingDebt)}</p>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-xl text-slate-800 px-2 mt-8">الخدمات</h3>

      <div className="grid grid-cols-2 gap-4 px-2">
        {menuItems.map((item, i) => (
          <Link key={i} href={item.href} className={cn(
            "block",
            i === menuItems.length - 1 && menuItems.length % 2 !== 0 ? "col-span-2" : ""
          )}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col items-center justify-center gap-4 text-center h-40 ${item.shadow}`}
            >
              <div className={`w-16 h-16 rounded-full ${item.color} flex items-center justify-center text-white shadow-inner`}>
                <item.icon className="w-8 h-8" />
              </div>
              <span className="font-bold text-slate-800">{item.title}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

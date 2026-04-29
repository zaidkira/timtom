import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { DistributorLayout } from "@/components/layout/DistributorLayout";
import { GlobalLocationRequest } from "@/components/GlobalLocationRequest";

import Login from "@/pages/login";
import Dashboard from "@/pages/admin/dashboard";
import Distributors from "@/pages/admin/distributors";
import Products from "@/pages/admin/products";
import Stores from "@/pages/admin/stores";
import Tasks from "@/pages/admin/tasks";
import Deliveries from "@/pages/admin/deliveries";
import Accounting from "@/pages/admin/accounting";
import MapPage from "@/pages/admin/map";
import Suggestions from "@/pages/admin/suggestions";
import TaskGroups from "@/pages/admin/task-groups";

import DistributorHome from "@/pages/distributor/home";
import DistributorTasks from "@/pages/distributor/tasks";
import DistributorMap from "@/pages/distributor/map";
import SuggestStore from "@/pages/distributor/suggest";
import DistributorStores from "@/pages/distributor/stores";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRole }: { component: any, allowedRole?: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Redirect to={user.role === 'admin' ? "/" : "/distributor"} />;
  }

  if (user.role === 'admin') {
    return <AdminLayout><Component /></AdminLayout>;
  } else {
    return <DistributorLayout><Component /></DistributorLayout>;
  }
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen bg-slate-50" />;

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to={user.role === 'admin' ? "/" : "/distributor"} /> : <Login />}
      </Route>

      <Route path="/">
        <ProtectedRoute component={Dashboard} allowedRole="admin" />
      </Route>
      <Route path="/distributors">
        <ProtectedRoute component={Distributors} allowedRole="admin" />
      </Route>
      <Route path="/products">
        <ProtectedRoute component={Products} allowedRole="admin" />
      </Route>
      <Route path="/stores">
        <ProtectedRoute component={Stores} allowedRole="admin" />
      </Route>
      <Route path="/tasks">
        <ProtectedRoute component={Tasks} allowedRole="admin" />
      </Route>
      <Route path="/deliveries">
        <ProtectedRoute component={Deliveries} allowedRole="admin" />
      </Route>
      <Route path="/accounting">
        <ProtectedRoute component={Accounting} allowedRole="admin" />
      </Route>
      <Route path="/map">
        <ProtectedRoute component={MapPage} allowedRole="admin" />
      </Route>
      <Route path="/suggestions">
        <ProtectedRoute component={Suggestions} allowedRole="admin" />
      </Route>
      <Route path="/task-groups">
        <ProtectedRoute component={TaskGroups} allowedRole="admin" />
      </Route>

      <Route path="/distributor">
        <ProtectedRoute component={DistributorHome} allowedRole="distributor" />
      </Route>
      <Route path="/distributor/tasks">
        <ProtectedRoute component={DistributorTasks} allowedRole="distributor" />
      </Route>
      <Route path="/distributor/map">
        <ProtectedRoute component={DistributorMap} allowedRole="distributor" />
      </Route>
      <Route path="/distributor/suggest">
        <ProtectedRoute component={SuggestStore} allowedRole="distributor" />
      </Route>
      <Route path="/distributor/stores">
        <ProtectedRoute component={DistributorStores} allowedRole="distributor" />
      </Route>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <GlobalLocationRequest />
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

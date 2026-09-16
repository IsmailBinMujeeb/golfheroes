import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { SubscriberLayout } from "@/components/layout/SubscriberLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { RequireAdmin, RequireAuth } from "@/components/layout/guards";

import Home from "@/pages/public/Home";
import HowItWorks from "@/pages/public/HowItWorks";
import Charities from "@/pages/public/Charities";
import CharityDetail from "@/pages/public/CharityDetail";
import Auth from "@/pages/public/Auth";
import Subscribe from "@/pages/public/Subscribe";
import NotFound from "@/pages/public/NotFound";

import Dashboard from "@/pages/app/Dashboard";
import Scores from "@/pages/app/Scores";
import Draws from "@/pages/app/Draws";
import CharitySettings from "@/pages/app/CharitySettings";
import Winnings from "@/pages/app/Winnings";
import Account from "@/pages/app/Account";

import AdminOverview from "@/pages/admin/Overview";
import AdminUsers from "@/pages/admin/Users";
import AdminDraws from "@/pages/admin/Draws";
import AdminCharities from "@/pages/admin/Charities";
import AdminWinners from "@/pages/admin/Winners";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/charities" element={<Charities />} />
              <Route path="/charities/:slug" element={<CharityDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route
              element={
                <RequireAuth>
                  <SubscriberLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scores" element={<Scores />} />
              <Route path="/draws" element={<Draws />} />
              <Route path="/charity" element={<CharitySettings />} />
              <Route path="/winnings" element={<Winnings />} />
              <Route path="/account" element={<Account />} />
            </Route>

            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="draws" element={<AdminDraws />} />
              <Route path="charities" element={<AdminCharities />} />
              <Route path="winners" element={<AdminWinners />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

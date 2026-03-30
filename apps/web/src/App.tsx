import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { CallsPage } from "@/pages/CallsPage";
import { CallDetailPage } from "@/pages/CallDetailPage";
import { FeedbackPage } from "@/pages/FeedbackPage";
import { FlagsPage } from "@/pages/FlagsPage";

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/calls/:id" element={<CallDetailPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/flags" element={<FlagsPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  );
}

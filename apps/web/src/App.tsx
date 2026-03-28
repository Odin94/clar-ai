import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import { CallsPage } from "@/pages/CallsPage";
import { CallDetailPage } from "@/pages/CallDetailPage";
import { FeedbackPage } from "@/pages/FeedbackPage";

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<CallsPage />} />
          <Route path="/calls/:id" element={<CallDetailPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  );
}

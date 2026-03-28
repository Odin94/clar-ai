import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import { CallsPage } from "@/pages/CallsPage";
import { CallDetailPage } from "@/pages/CallDetailPage";

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<CallsPage />} />
          <Route path="/calls/:id" element={<CallDetailPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  );
}

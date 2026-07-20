import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { TopNav } from "./TopNav";
import { ChatView } from "@/features/chat/ChatView";

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-g-light">
      <TopNav />
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.div>
      <ChatView />
    </div>
  );
}

import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

const DashboardLayout = () => {
  // Mobile drawer open/close
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop collapse (icon-only) state, remembered across reloads
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem("sidebarCollapsed", String(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen ">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div
        className={`min-h-screen transition-[padding] bg-[#f0f4ff]  duration-300 ease-in-out ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
      >
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
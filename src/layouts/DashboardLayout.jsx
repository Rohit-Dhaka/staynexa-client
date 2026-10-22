
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        // Continue normally when browser storage is unavailable.
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
        className={`min-h-screen min-w-0 transition-[padding] duration-300 ease-in-out ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
      >
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className=" bg-white mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-7">
          <div className="min-w-0 ">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./Layout.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="layout">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        refreshKey={refreshKey}
      />
      <main className="layout-main">
        <Outlet context={{ triggerRefresh }} />
      </main>
    </div>
  );
}

import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./TopBar";

export default function Layout({ profile }) {
  const [open, setOpen] = useState(true); // true = expanded

  return (
    <div className="flex h-screen bg-white text-black">
      <Sidebar open={open} setOpen={setOpen} profile={profile} />

      <div className="flex flex-col flex-1">
        <Topbar profile={profile} />

        <main className="p-6 overflow-y-auto bg-white text-black h-full">
          {/* routed pages render here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

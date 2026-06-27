import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./TopBar";
import BottomNav from "./BottomNav";

export default function Layout({ profile }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white text-black">
      <Sidebar open={open} setOpen={setOpen} profile={profile} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar profile={profile} />

        <main className="flex-1 overflow-y-auto bg-white pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

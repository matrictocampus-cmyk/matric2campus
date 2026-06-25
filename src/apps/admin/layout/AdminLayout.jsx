import { Outlet } from "react-router-dom"

export default function AdminLayout() {
  return (
    <div style={{ display: "flex" }}>
      <aside>Admin Sidebar</aside>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

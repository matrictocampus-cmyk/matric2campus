import { Outlet } from "react-router-dom";

export default function SimpleAdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ 
        width: 200, 
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRight: '1px solid #dee2e6'
      }}>
        <h3>Admin Panel</h3>
        <nav style={{ marginTop: 20 }}>
          <a href="/admin" style={{ display: 'block', marginBottom: 12 }}>
            Dashboard
          </a>
          <button 
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            style={{ 
              display: 'block', 
              marginTop: 20,
              padding: '8px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4
            }}
          >
            ← Back to User App
          </button>
        </nav>
      </div>
      
      <div style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </div>
    </div>
  );
}
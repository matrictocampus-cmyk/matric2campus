import React from 'react'

export default function TopHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 
                       border-b border-green-500/20 bg-[#0b0b0b] shadow-md shadow-green-500/10">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white">Hello, <span className="text-green-400">User Name</span></h1>
        <div className="text-sm text-green-300/80">
          Student ID: <span className="font-medium text-green-400">—</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-green-500/10 transition text-green-400">
          🔔
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">3</span>
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center font-bold text-black shadow-lg shadow-green-500/40">
            S
          </div>
          <div className="text-sm text-white">User Name</div>
        </div>
      </div>
    </header>
  )
}

export default function StatusCard({ title, value }) {
  return (
    <div className="bg-[#0c0c0c] p-5 rounded-2xl border border-green-500/40 
                    shadow-lg shadow-green-500/20 flex items-center justify-between">
      <div>
        <div className="text-sm text-green-400/80">{title}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
      <div className="text-green-500 text-3xl">📁</div>
    </div>
  );
}

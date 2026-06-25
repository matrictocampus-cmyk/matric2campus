export default function Stepper({ steps = [], current = 1 }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      {steps.map((s, i) => {
        const active = s.id === current;

        return (
          <div key={s.id} className="flex items-center gap-3">
            <div
              className={`w-9 h-9 flex items-center justify-center rounded-full border transition
                ${
                  active
                    ? "bg-green-500 text-black border-green-500 shadow-lg shadow-green-500/40"
                    : "bg-[#111] text-gray-400 border-gray-700"
                }`}
            >
              {s.id}
            </div>

            <span
              className={`hidden sm:block text-sm ${
                active ? "text-green-400 font-semibold" : "text-gray-500"
              }`}
            >
              {s.title}
            </span>

            {i !== steps.length - 1 && (
              <div className="hidden sm:block w-12 h-[2px] bg-gray-700"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

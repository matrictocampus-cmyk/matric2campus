import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "txi_matches_tutorial_dismissed";

const STEPS = [
  {
    selector: '[data-tutorial="matches-aps"]',
    emoji: "📊",
    title: "Your APS score",
    body: [
      "Your APS (Admission Point Score) is calculated automatically from the subject marks you entered in your Profile.",
      "It's the main number universities and colleges use to decide if you qualify for a course.",
      "A **green dot** on a course means you fully meet all requirements. An **amber dot** means you're close — tap 'Details' on the card to see exactly what's missing.",
    ],
    tip: "Update your marks in Profile any time and your matches here refresh automatically.",
  },
  {
    selector: '[data-tutorial="matches-cao"]',
    emoji: "🏛️",
    title: "CAO Universities",
    body: [
      "CAO stands for Central Applications Office. Certain universities — including DUT, MUT, UKZN, University of Zululand, and others — only accept applications through CAO.",
      "You submit **one** application at cao.ac.za that covers all of them. From that single application, you can list up to **6 course choices** spread across any CAO universities.",
      "This column tracks your spots. When you add a course here, the counter at the top updates. Once you hit 6/6, adding more is blocked.",
    ],
    tip: "Choose your 6 courses carefully — prioritise what you actually want to study, not just what you think you'll get in.",
  },
  {
    selector: '[data-tutorial="matches-university"]',
    emoji: "🎓",
    title: "Universities — Direct / NBT",
    body: [
      "These universities each run their own application portal. You apply to them separately, not through CAO.",
      "Some — like Wits, UCT, and Stellenbosch — also require you to write the **National Benchmark Test (NBT)** before applying. Check each university's individual requirements.",
      "You can apply to up to **3 courses per university**. But you can apply to multiple universities, so there's no limit on universities overall — only on how many courses per institution.",
    ],
    tip: "Start applications for these universities early — their portals often open months before the deadline.",
  },
  {
    selector: '[data-tutorial="matches-private"]',
    emoji: "🏫",
    title: "Private Colleges",
    body: [
      "Private colleges are independently owned institutions — examples include Rosebank College, Varsity College, AFDA, and IIE institutions.",
      "They generally have more flexible entry requirements and shorter application windows.",
      "There is **no limit** on how many private college courses you can add. Apply to as many as you like.",
    ],
    tip: "Private colleges are a great backup option and often accept students who narrowly miss university requirements.",
  },
  {
    selector: '[data-tutorial="matches-tvet"]',
    emoji: "🔧",
    title: "TVET Colleges",
    body: [
      "TVET stands for Technical and Vocational Education and Training. These colleges offer N-courses (N1–N6), National Certificates, and National Diplomas focused on practical skills.",
      "TVET is an excellent path if you want to enter the workforce quickly, or if you prefer hands-on learning over a traditional degree.",
      "Like private colleges, there is **no limit** on TVET courses you can add.",
    ],
    tip: "An N6 + 18 months workplace experience = a National Diploma. Many TVET graduates earn more than degree holders in their field.",
  },
  {
    selector: '[data-tutorial="matches-grid"]',
    emoji: "➕",
    title: "How to add courses",
    body: [
      "Tap the **+** button on any course card to add it to your application basket. You can freely mix courses from different sections in the same basket.",
      "Each card shows small badges: **'Matches You'** means the course aligns with interests you set in your Profile. **'In Demand'** means it's a high-growth career in South Africa right now.",
      "Tap **▼ Details** on a card to see exactly which subjects are required and what career paths the course leads to.",
    ],
    tip: "Add more than you need, then narrow down later — you can always remove courses from your basket before applying.",
  },
  {
    selector: '[data-tutorial="matches-basket"]',
    emoji: "🧺",
    title: "Your application basket",
    body: [
      "Every course you add appears here, grouped by section — so you can clearly see how many CAO spots you've used, how many direct university courses you've selected, and so on.",
      "Tap **✕** next to any course to remove it. There's no limit on how long courses stay in your basket.",
      "When you're ready, tap **Proceed to Apply**. You'll choose between two paths: apply yourself using direct portal links, or pay R250 for our team to handle everything from start to finish.",
    ],
    tip: null,
  },
];

export default function MyMatchesTutorial() {
  const [step,      setStep]      = useState(0);
  const [visible,   setVisible]   = useState(false);
  const [spotlight, setSpotlight] = useState(null);
  const [cardPos,   setCardPos]   = useState({});
  const skipCount = useRef(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }, []);

  const computeLayout = useCallback((idx) => {
    const s = STEPS[idx];
    const el = s?.selector ? document.querySelector(s.selector) : null;
    if (!el) return null;

    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const rect = el.getBoundingClientRect();
    const PAD = 8;
    const spot = {
      top: rect.top - PAD, left: rect.left - PAD,
      width: rect.width + PAD * 2, height: rect.height + PAD * 2,
    };

    const VW = window.innerWidth;
    const VH = window.innerHeight;
    const CARD_W = Math.min(320, VW - 24);

    // Try to place card below spotlight; if not enough room, above
    const belowY = spot.top + spot.height + 14;
    const aboveY = spot.top - 14; // we'll use bottom offset
    const hasRoomBelow = belowY + 280 < VH;

    let card;
    // Horizontal: center on spotlight but clamp to viewport
    const idealLeft = spot.left + spot.width / 2 - CARD_W / 2;
    const clampedLeft = Math.max(8, Math.min(VW - CARD_W - 8, idealLeft));

    if (hasRoomBelow) {
      card = { position: "fixed", top: belowY, left: clampedLeft, width: CARD_W };
    } else {
      // Place above — use bottom from bottom of viewport
      card = { position: "fixed", bottom: VH - spot.top + 14, left: clampedLeft, width: CARD_W };
    }

    return { spot, card, arrowUp: hasRoomBelow };
  }, []);

  const applyStep = useCallback((idx) => {
    if (idx >= STEPS.length) { dismiss(); return; }
    const layout = computeLayout(idx);
    if (!layout) {
      // Element not found — skip (guard against infinite loop)
      skipCount.current += 1;
      if (skipCount.current >= STEPS.length) { dismiss(); return; }
      setStep(idx + 1);
      return;
    }
    skipCount.current = 0;
    setSpotlight(layout.spot);
    setCardPos({ ...layout.card, arrowUp: layout.arrowUp });
  }, [computeLayout, dismiss]);

  useEffect(() => {
    if (!visible) return;
    applyStep(step);
  }, [visible, step, applyStep]);

  useEffect(() => {
    if (!visible) return;
    const h = () => applyStep(step);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [visible, step, applyStep]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const { arrowUp, ...cardStyle } = cardPos;

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.58)" }} onClick={dismiss} />

      {/* Spotlight cutout */}
      {spotlight && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: spotlight.top, left: spotlight.left,
            width: spotlight.width, height: spotlight.height,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.58)",
            border: "2.5px solid #FF7A18",
          }}
        />
      )}

      {/* Card */}
      <div className="fixed z-50 bg-white rounded-2xl shadow-2xl overflow-hidden" style={cardStyle}>

        {/* Arrow pointing up toward spotlight (when card is below) */}
        {arrowUp && spotlight && (
          <div
            className="absolute"
            style={{
              top: -9,
              left: Math.max(16, Math.min((cardPos.width || 320) - 32,
                spotlight.left + spotlight.width / 2 - (cardPos.left || 0) - 9
              )),
              width: 0, height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderBottom: "9px solid #FF7A18",
            }}
          />
        )}

        {/* Arrow pointing down toward spotlight (when card is above) */}
        {!arrowUp && spotlight && (
          <div
            className="absolute"
            style={{
              bottom: -9,
              left: Math.max(16, Math.min((cardPos.width || 320) - 32,
                spotlight.left + spotlight.width / 2 - (cardPos.left || 0) - 9
              )),
              width: 0, height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: "9px solid #FF7A18",
            }}
          />
        )}

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-gray-100">
          <div
            className="h-full transition-all duration-400 rounded-full"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: "#FF7A18" }}
          />
        </div>

        <div className="p-4 space-y-3">
          {/* Step dots + count */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i === step ? "#FF7A18" : i < step ? "#0F0F0F" : "#e5e7eb" }}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">{step + 1} of {STEPS.length}</span>
          </div>

          {/* Emoji + title */}
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{current.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-900 text-sm leading-snug">{current.title}</p>
            </div>
          </div>

          {/* Body paragraphs */}
          <div className="space-y-2">
            {current.body.map((para, i) => (
              <p key={i} className="text-xs text-gray-600 leading-relaxed">
                {para.split(/\*\*(.+?)\*\*/).map((chunk, j) =>
                  j % 2 === 0
                    ? chunk
                    : <strong key={j} className="font-bold text-gray-900">{chunk}</strong>
                )}
              </p>
            ))}
          </div>

          {/* Tip box */}
          {current.tip && (
            <div className="flex items-start gap-2 p-2.5 bg-orange-50 border border-orange-100 rounded-xl">
              <span className="text-sm flex-shrink-0">💡</span>
              <p className="text-[11px] text-orange-800 leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <button
              onClick={dismiss}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Dismiss
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) dismiss();
                  else setStep(s => s + 1);
                }}
                className="text-xs font-bold text-white px-4 py-1.5 rounded-xl"
                style={{ background: "#FF7A18" }}
              >
                {isLast ? "Got it ✓" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

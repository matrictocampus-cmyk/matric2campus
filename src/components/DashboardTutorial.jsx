import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "txi_tutorial_dismissed";

const STEPS = [
  {
    selector:  '[data-tutorial="bell"]',
    emoji:     "🔔",
    title:     "Your notifications",
    text:      "Tap the bell to see real-time updates — like when a staff member starts working on your application, when it's been submitted, or when we need something from you.",
    cardAlign: "right",
  },
  {
    selector:  '[data-tutorial="stats"]',
    emoji:     "📊",
    title:     "Your academic profile",
    text:      "This card shows your APS score, grade, and interests. Your APS is calculated from your subject marks and determines which courses you qualify for. Tap 'Edit profile' to update your marks anytime.",
    cardAlign: "center",
  },
  {
    selector:  '[data-tutorial="tracker"]',
    emoji:     "📋",
    title:     "Application tracker",
    text:      "Once you apply for assistance through us, you can track everything right here in real time. When our team is actively working, you'll see a live green indicator.",
    cardAlign: "center",
  },
  {
    selector:  '[data-tutorial="recommendations"]',
    emoji:     "✨",
    title:     "Course recommendations",
    text:      "These are courses matched to your interests and APS score. Tap 'See all' to open My Matches where you can browse every course you qualify for and add them to your application.",
    cardAlign: "center",
  },
  {
    selector:  '[data-tutorial="actions"]',
    emoji:     "🚀",
    title:     "Quick actions",
    text:      "Use these buttons to jump straight to browsing institutions or to explore all courses you qualify for in My Matches. You can apply yourself or let our team handle it.",
    cardAlign: "center",
  },
];

export default function DashboardTutorial() {
  const [step,       setStep]       = useState(0);
  const [visible,    setVisible]    = useState(false);
  const [spotlight,  setSpotlight]  = useState(null); // {top, left, width, height}
  const [cardStyle,  setCardStyle]  = useState({});

  // Check if already dismissed
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const computeLayout = useCallback((idx) => {
    const s = STEPS[idx];
    const el = s?.selector ? document.querySelector(s.selector) : null;
    if (!el) {
      // Skip this step if element not found
      return null;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const rect = el.getBoundingClientRect();
    const GAP = 8;
    const spot = {
      top:    rect.top    - GAP,
      left:   rect.left   - GAP,
      width:  rect.width  + GAP * 2,
      height: rect.height + GAP * 2,
    };

    // Position the card based on the align config
    let card = {};
    const CARD_W = 300;
    const VH = window.innerHeight;
    const VW = window.innerWidth;

    if (s.cardAlign === "right") {
      // Pin card to top-right, near bell
      card = {
        position: "fixed",
        top:  Math.max(4, spot.top + spot.height + 12),
        right: VW - spot.left - spot.width,
      };
    } else {
      // Center below spotlight or center of screen
      const cardLeft = Math.max(8, Math.min(VW - CARD_W - 8, spot.left + spot.width / 2 - CARD_W / 2));
      const cardTop  = spot.top + spot.height + 16;
      const cardBottom = VH - spot.top + 16;
      // Prefer below, but flip above if not enough room
      if (cardTop + 160 < VH) {
        card = { position: "fixed", top: cardTop, left: cardLeft, width: CARD_W };
      } else {
        card = { position: "fixed", bottom: cardBottom, left: cardLeft, width: CARD_W };
      }
    }

    return { spot, card };
  }, []);

  const applyStep = useCallback((idx) => {
    const layout = computeLayout(idx);
    if (!layout) {
      // Element not found — skip to next
      if (idx + 1 < STEPS.length) {
        setStep(idx + 1);
      } else {
        dismiss();
      }
      return;
    }
    setSpotlight(layout.spot);
    setCardStyle(layout.card);
  }, [computeLayout]);

  useEffect(() => {
    if (!visible) return;
    applyStep(step);
  }, [visible, step, applyStep]);

  // Recompute on resize
  useEffect(() => {
    if (!visible) return;
    const handler = () => applyStep(step);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [visible, step, applyStep]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const next = () => {
    if (step + 1 < STEPS.length) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  // Arrow direction — detect if card is above or below spotlight
  const arrowUp = cardStyle.top !== undefined && spotlight && cardStyle.top > spotlight.top;

  return (
    <>
      {/* Dark overlay (pointer events only on the overlay, not the spotlight area) */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={dismiss}
      />

      {/* Spotlight cutout (sits above overlay, clears the target element) */}
      {spotlight && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top:          spotlight.top,
            left:         spotlight.left,
            width:        spotlight.width,
            height:       spotlight.height,
            borderRadius: 14,
            boxShadow:    "0 0 0 9999px rgba(0,0,0,0.55)",
            border:       "2px solid #FF7A18",
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="fixed z-50 bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ ...cardStyle, maxWidth: 320, minWidth: 260 }}
      >
        {/* Orange arrow pointing up toward spotlight (when card is below) */}
        {arrowUp && (
          <div
            className="absolute"
            style={{
              top:         -8,
              left:        cardStyle.right !== undefined ? "auto" : "50%",
              right:       cardStyle.right !== undefined ? 16 : "auto",
              marginLeft:  cardStyle.right !== undefined ? 0 : -8,
              width:       0,
              height:      0,
              borderLeft:  "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom:"8px solid #FF7A18",
            }}
          />
        )}

        {/* Accent bar + step count */}
        <div className="h-1.5 w-full" style={{ background: "#FF7A18" }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width:      `${((step + 1) / STEPS.length) * 100}%`,
              background: "#0F0F0F",
            }}
          />
        </div>

        <div className="p-4 space-y-3">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i === step ? "#FF7A18" : i < step ? "#0F0F0F" : "#e5e7eb" }}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">{step + 1}/{STEPS.length}</span>
          </div>

          {/* Emoji + title */}
          <div className="flex items-start gap-2.5">
            <span className="text-2xl flex-shrink-0">{current.emoji}</span>
            <div>
              <p className="font-extrabold text-gray-900 text-sm leading-snug">{current.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{current.text}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <button
              onClick={dismiss}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Dismiss
            </button>
            <button
              onClick={next}
              className="text-xs font-bold text-white px-4 py-2 rounded-xl"
              style={{ background: "#FF7A18" }}
            >
              {isLast ? "Done ✓" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

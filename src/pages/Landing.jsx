import React, { useState, useRef, useEffect } from "react";
import { ClipboardList, GraduationCap, BarChart2, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Login from "./Auth/Login";

const SAFlag = () => (
  <img
    src="/sa-flag.svg"
    alt=""
    aria-hidden="true"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
  />
);

const FEATURES = [
  { Icon: ClipboardList, color: "#6366f1", title: "Free Career Quiz",  desc: "Discover what you qualify for based on your marks and interests." },
  { Icon: GraduationCap, color: "#007A4D",  title: "Explore Degrees",  desc: "Find degrees and careers you never knew existed." },
  { Icon: BarChart2,     color: "#FFB612",  title: "Smart Insights",   desc: "Personalised insights about your future opportunities." },
  { Icon: BookOpen,      color: "#DE3831",  title: "Resources",        desc: "Guides and tools to help you make informed decisions." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const canvasRef   = useRef(null);
  const contentRef  = useRef(null);
  const cursorRef   = useRef(null);
  const animRef     = useRef(null);
  const particlesRef = useRef([]);
  const isMobileRef = useRef(
    typeof window !== "undefined"
      ? window.innerWidth < 768 || "ontouchstart" in window
      : false
  );

  // ── Particle constellation ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function checkMobile() {
      isMobileRef.current = window.innerWidth < 768 || "ontouchstart" in window;
    }
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      checkMobile();
      const count = Math.floor((canvas.width * canvas.height) / (isMobileRef.current ? 14000 : 9000));
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.1 + 0.3,
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const maxD = isMobileRef.current ? 95 : 130;
      const ps   = particlesRef.current;
      const lim  = isMobileRef.current ? 3 : ps.length;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.38)"; ctx.fill();
        let drawn = 0;
        for (let j = i + 1; j < ps.length && drawn < lim; j++) {
          const q = ps[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxD) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(129,140,248,${(1 - d / maxD) * 0.11})`;
            ctx.lineWidth = 0.35; ctx.stroke(); drawn++;
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    resize(); draw();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 300));
    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ── Parallax + cursor glow ──────────────────────────────────────
  useEffect(() => {
    function move(x, y) {
      const nx = (x / window.innerWidth) * 2 - 1;
      const ny = (y / window.innerHeight) * 2 - 1;
      const amp = isMobileRef.current ? 5 : 11;
      if (contentRef.current)
        contentRef.current.style.transform = `translate(${nx * amp}px,${ny * amp}px)`;
      if (cursorRef.current) {
        cursorRef.current.style.left = x + "px";
        cursorRef.current.style.top  = y + "px";
      }
    }
    const onMouse = (e) => move(e.clientX, e.clientY);
    const onTouch = (e) => { if (e.touches.length > 0) move(e.touches[0].clientX, e.touches[0].clientY); };
    document.addEventListener("mousemove", onMouse);
    document.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMouse);
      document.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <div style={{
      position: "relative", width: "100vw", height: "100dvh", overflow: "hidden",
      fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif",
      background: "#06060b",
      WebkitTapHighlightColor: "transparent",
      WebkitFontSmoothing: "antialiased",
      overscrollBehavior: "none",
      touchAction: "manipulation",
    }}>

      {/* ── SA flag (full-screen base) ── */}
      <div style={{ position: "absolute", inset: 0 }}>
        <SAFlag />
      </div>

      {/* ── Dark overlay: diagonal "/" — dark all the way, flag only reveals far right ── */}
      <div className="m2c-overlay" style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3,
        background: "linear-gradient(70deg, rgba(4,4,10,0.97) 0%, rgba(4,4,10,0.97) 72%, rgba(4,4,10,0.88) 80%, rgba(4,4,10,0.40) 88%, rgba(4,4,10,0.04) 94%, rgba(4,4,10,0.0) 100%)",
      }} />

      {/* ── Mobile only: white fade from top → transparent, stops at brand name level ── */}
      <div className="m2c-white-fade" style={{
        position: "absolute", top: 0, left: 0, right: 0,
        pointerEvents: "none", display: "none",
        zIndex: 7,
      }} />

      {/* ── Indigo depth accents ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background:
          "radial-gradient(ellipse at 25% 20%, rgba(99,102,241,0.09) 0%, transparent 50%)," +
          "radial-gradient(ellipse at 75% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)",
      }} />

      {/* ── Particle canvas ── */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, opacity: 0.45 }} />

      {/* ── Student image slot (far right) ── */}
      <div className="m2c-students-container" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "36%", zIndex: 5, pointerEvents: "none", background: "#06060b" }}>
        <img
          src="/students.png"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="m2c-students-img"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
          onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
        />
        {/* top + bottom edge fades (desktop: dark bg blend; mobile: transparent so flag shows) */}
        <div className="m2c-img-fade-tb" style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to bottom, #06060b 0%, transparent 12%, transparent 82%, #06060b 100%)" }} />
        {/* right edge fade */}
        <div className="m2c-img-fade-r" style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to left, #06060b 0%, transparent 18%)" }} />
      </div>

      {/* ── FREE badge ── */}
      <div className="m2c-free-badge">
        <span className="m2c-free-dot" />
        FREE &bull; No sign up. No paywalls. Ever.
      </div>

      {/* ── Sign In button (top right) ── */}
      <button
        className="m2c-signin-btn"
        onClick={() => setShowAuth(true)}
      >
        Sign In
      </button>

      {/* ── Hero content (centered, shifts up to make room for tiles) ── */}
      <div
        ref={contentRef}
        className="m2c-hero"
        style={{
          position: "absolute", inset: 0, zIndex: 10,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 clamp(1.2rem, 4vw, 3rem)",
          paddingBottom: "clamp(108px, 16vh, 148px)",
          boxSizing: "border-box",
          transition: "transform 0.2s ease-out",
        }}
      >
        {/* Brand */}
        <h1 className="m2c-brand">
          <span className="m2c-matric">Matric</span>
          <span className="m2c-two">2</span>
          <span className="m2c-campus">Campus</span>
        </h1>

        {/* Slogan */}
        <p className="m2c-slogan">
          Know where <span className="m2c-gold">you stand.</span>
          <br />
          Discover where <span className="m2c-green">you could go.</span>
        </p>

        {/* CTA */}
        <button className="m2c-btn" onClick={() => navigate("/onboarding")}>
          Start Quiz&nbsp;<span className="m2c-arrow">→</span>
        </button>

        {/* Social proof */}
        <div className="m2c-proof">
          <div className="m2c-avatars">
            {["#6366f1", "#007A4D", "#FFB612", "#DE3831"].map((c, i) => (
              <div key={i} className="m2c-avatar" style={{ background: c }} />
            ))}
          </div>
          <span>Join 250K+ students exploring their future</span>
        </div>
      </div>

      {/* ── Feature tiles (bottom strip) ── */}
      <div className="m2c-tiles">
        {FEATURES.map(({ Icon, color, title, desc }, i) => (
          <div key={i} className="m2c-tile" style={{ "--delay": `${1.5 + i * 0.1}s` }}>
            <div className="m2c-tile-icon" style={{ background: color }}>
              <Icon size={15} color="#fff" strokeWidth={2.5} />
            </div>
            <div className="m2c-tile-body">
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Cursor glow ── */}
      <div ref={cursorRef} className="m2c-cursor" />

      {/* ── Auth modal ── */}
      {showAuth && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
          style={{
            position: "absolute", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.58)",
            backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
            padding: "1rem",
          }}
        >
          <div style={{
            position: "relative", width: "100%", maxWidth: "26rem",
            background: "rgba(12,12,22,0.88)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "1.5rem", padding: "2rem",
            backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
          }}>
            <button onClick={() => setShowAuth(false)} style={{
              position: "absolute", top: "1rem", right: "1.25rem",
              background: "none", border: "none",
              color: "rgba(255,255,255,0.45)", fontSize: "1.75rem",
              cursor: "pointer", lineHeight: 1, fontWeight: 300,
            }}>×</button>

            <Login />
          </div>
        </div>
      )}

      {/* ── All scoped styles ── */}
      <style>{`
        /* ── Brand name ── */
        .m2c-brand {
          font-size: clamp(2.8rem, 9.5vw, 6.5rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.05;
          margin: 0;
          user-select: none;
          opacity: 0;
          transform: translateY(30px);
          animation: m2cUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
          display: flex; flex-wrap: wrap;
          align-items: center; justify-content: center;
        }
        .m2c-matric {
          background: linear-gradient(135deg,#d4a574 0%,#c4956a 15%,#e8c99b 30%,#b8875e 45%,#d4a574 60%,#c4956a 75%,#e8c99b 90%,#b8875e 100%);
          background-size: 300% 300%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px rgba(0,0,0,0.75);
          animation: m2cTextureShift 8s ease-in-out infinite;
          filter: drop-shadow(0 2px 6px rgba(180,130,90,0.5));
        }
        .m2c-two {
          color: #4f6eb3; -webkit-text-fill-color: #4f6eb3;
          -webkit-text-stroke: 1px rgba(0,0,0,0.75);
          text-shadow: 0 2px 10px rgba(79,110,179,0.55);
          margin: 0 -0.01em;
        }
        .m2c-campus {
          background-image: url('/sa-flag.svg');
          background-size: cover; background-position: center;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px rgba(0,0,0,0.75);
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.65)) brightness(1.1);
          animation: m2cFlagGlow 4s ease-in-out infinite;
        }

        /* ── Slogan ── */
        .m2c-slogan {
          font-size: clamp(1.1rem, 3vw, 2rem);
          font-weight: 500;
          line-height: 1.45;
          text-align: center;
          color: rgba(255,255,255,0.88);
          margin: clamp(0.7rem, 1.6vh, 1.3rem) 0 0 0;
          user-select: none;
          opacity: 0; transform: translateY(20px);
          animation: m2cUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
        }
        .m2c-gold  { color: #FFB612; font-weight: 700; }
        .m2c-green { color: #4ade80; font-weight: 700; }

        /* ── CTA button ── */
        .m2c-btn {
          position: relative;
          margin-top: clamp(1.5rem, 3.2vh, 2.2rem);
          padding: clamp(0.78rem, 2vh, 1rem) clamp(1.9rem, 5vw, 3rem);
          font-family: inherit;
          font-size: clamp(0.95rem, 2.3vw, 1.15rem);
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #ffffff;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #6366f1 100%);
          background-size: 200% 200%;
          border: none; border-radius: 12px;
          cursor: pointer; white-space: nowrap; outline: none;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 4px 28px rgba(99,102,241,0.45), 0 1px 6px rgba(0,0,0,0.25);
          transition: transform 0.32s cubic-bezier(0.2,0.9,0.4,1), box-shadow 0.32s;
          opacity: 0; transform: translateY(20px);
          animation: m2cUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.72s forwards,
                     m2cBgShift 6s ease infinite;
          overflow: hidden;
        }
        /* shimmer sweep */
        .m2c-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg,transparent 20%,rgba(255,255,255,0.18) 50%,transparent 80%);
          background-size: 200% 100%;
          animation: m2cShimmer 3.2s ease-in-out 2.8s infinite;
          pointer-events: none; border-radius: inherit;
        }
        .m2c-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg,rgba(255,255,255,0.1) 0%,transparent 50%,rgba(255,255,255,0.05) 100%);
          border-radius: inherit; pointer-events: none;
        }
        @media (hover: hover) and (pointer: fine) {
          .m2c-btn:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 12px 40px rgba(99,102,241,0.58), 0 2px 8px rgba(0,0,0,0.3) !important;
          }
          .m2c-btn:hover .m2c-arrow { transform: translateX(6px); }
        }
        .m2c-btn:active { transform: scale(0.96) !important; }
        .m2c-arrow { display: inline-block; transition: transform 0.28s ease; }

        /* ── Social proof ── */
        .m2c-proof {
          display: flex; align-items: center; gap: 0.7rem;
          margin-top: 1.1rem;
          opacity: 0; animation: m2cUp 0.7s ease 1.05s forwards;
        }
        .m2c-avatars { display: flex; }
        .m2c-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          border: 2px solid rgba(12,12,24,0.9);
          margin-left: -7px;
        }
        .m2c-avatar:first-child { margin-left: 0; }
        .m2c-proof span {
          font-size: clamp(0.7rem, 1.35vw, 0.8rem);
          color: rgba(255,255,255,0.48);
          font-weight: 400; letter-spacing: 0.01em;
        }

        /* ── FREE badge ── */
        .m2c-free-badge {
          position: absolute;
          top: clamp(1rem, 2.4vh, 1.6rem);
          left: clamp(1.2rem, 3vw, 2rem);
          z-index: 20;
          display: flex; align-items: center; gap: 0.45rem;
          background: rgba(8,8,18,0.62);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 100px;
          padding: 0.3rem 0.8rem;
          font-size: clamp(0.66rem, 1.25vw, 0.74rem);
          font-weight: 500;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.02em;
          opacity: 0;
          animation: m2cFadeDown 0.7s ease 0.1s forwards;
        }
        .m2c-free-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80; flex-shrink: 0;
          animation: m2cDotPulse 2s ease-in-out infinite;
        }

        /* ── Sign In button ── */
        .m2c-signin-btn {
          position: absolute;
          top: clamp(1rem, 2.4vh, 1.6rem);
          right: clamp(1.2rem, 3vw, 2rem);
          z-index: 20;
          background: rgba(8,8,18,0.62);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 100px;
          padding: 0.3rem 1rem;
          font-size: clamp(0.66rem, 1.25vw, 0.74rem);
          font-weight: 600;
          color: rgba(255,255,255,0.82);
          letter-spacing: 0.02em;
          cursor: pointer;
          font-family: inherit;
          opacity: 0;
          animation: m2cFadeDown 0.7s ease 0.1s forwards;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        @media (hover: hover) and (pointer: fine) {
          .m2c-signin-btn:hover {
            background: rgba(255,122,24,0.18);
            border-color: rgba(255,122,24,0.45);
            color: #fff;
          }
        }
        .m2c-signin-btn:active { opacity: 0.75; }

        /* ── Student image (fade-in from right, left-edge fade) ── */
        .m2c-students-img {
          mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 20%, black 42%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 20%, black 42%);
          opacity: 0;
          animation: m2cImgReveal 1.3s cubic-bezier(0.16,1,0.3,1) 0.55s forwards;
        }

        /* ── Feature tiles ── */
        .m2c-tiles {
          position: absolute; bottom: 0; left: 0; right: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: clamp(0.45rem, 0.9vw, 0.7rem);
          padding: 0 clamp(1rem, 2.2vw, 1.75rem) clamp(0.7rem, 1.8vh, 1.2rem);
        }
        .m2c-tile {
          background: rgba(7,7,16,0.7);
          backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: clamp(0.6rem, 1.4vw, 0.85rem) clamp(0.7rem, 1.4vw, 1rem);
          display: flex; gap: 0.65rem; align-items: flex-start;
          opacity: 0; transform: translateY(22px);
          animation: m2cUp 0.65s cubic-bezier(0.16,1,0.3,1) var(--delay) forwards;
          transition: transform 0.24s ease, border-color 0.24s ease,
                      box-shadow 0.24s ease, background 0.24s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .m2c-tile:hover {
            transform: translateY(-3px) !important;
            border-color: rgba(255,255,255,0.14);
            box-shadow: 0 8px 24px rgba(0,0,0,0.38);
            background: rgba(12,12,26,0.8);
          }
        }
        .m2c-tile-icon {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; opacity: 0.92;
        }
        .m2c-tile-body strong {
          display: block;
          font-size: clamp(0.66rem, 1.15vw, 0.76rem);
          font-weight: 700; color: rgba(255,255,255,0.88);
          margin-bottom: 0.18rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .m2c-tile-body p {
          margin: 0;
          font-size: clamp(0.58rem, 1vw, 0.66rem);
          line-height: 1.5; color: rgba(200,200,218,0.55);
          font-weight: 300;
          display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        /* ── Cursor glow ── */
        .m2c-cursor {
          position: fixed; pointer-events: none; z-index: 9999;
          width: 42px; height: 42px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.52) 0%, transparent 72%);
          mix-blend-mode: screen; transform: translate(-50%,-50%);
          opacity: 0; transition: opacity 0.3s;
        }
        @media (hover: hover) and (pointer: fine) {
          .m2c-cursor { opacity: 1 !important; }
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          /* Brand + slogan stay at top; button centered via margin-top calc */
          .m2c-hero {
            justify-content: flex-start !important;
            padding-top: 8vh !important;
            padding-bottom: 175px !important;
          }
          /* Let flag + student ghost breathe — ease the bottom so both show through */
          .m2c-overlay {
            background: linear-gradient(
              to bottom,
              rgba(4,4,10,0.0)  0%,
              rgba(4,4,10,0.0)  18%,
              rgba(4,4,10,0.15) 32%,
              rgba(4,4,10,0.30) 52%,
              rgba(4,4,10,0.48) 72%,
              rgba(4,4,10,0.62) 100%
            ) !important;
          }
          /* White-to-transparent fade: top → just past the brand name (~26vh) */
          .m2c-white-fade {
            display: block !important;
            height: 30vh;
            background: linear-gradient(
              to bottom,
              rgba(255,255,255,0.80) 0%,
              rgba(255,255,255,0.62) 18%,
              rgba(255,255,255,0.28) 55%,
              rgba(255,255,255,0.06) 82%,
              transparent 100%
            );
          }
          /* Pull button to vertical center of the screen */
          .m2c-btn {
            margin-top: calc(40vh - 118px) !important;
            min-height: 46px !important;
          }
          /* Tiles 2-col, compact */
          .m2c-tiles {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.4rem !important;
            padding: 0 0.85rem 1rem !important;
          }
          .m2c-tile { padding: 0.55rem 0.65rem !important; }
          /* Student photo: full-screen ghost layer — flag visible through it */
          .m2c-students-container {
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            height: auto !important;
            bottom: 0 !important;
            background: transparent !important;
            z-index: 2 !important;
          }
          .m2c-students-img {
            object-fit: cover !important;
            object-position: center center !important;
            opacity: 0.55 !important;
            animation: m2cImgReveal 1.3s cubic-bezier(0.16,1,0.3,1) 0.55s forwards !important;
            mask-image: none !important;
            -webkit-mask-image: none !important;
          }
          /* Scale brand slightly for narrow screens */
          .m2c-brand { font-size: clamp(2.2rem, 10.5vw, 3rem) !important; }
          /* Slogan + proof: strong shadow so white text reads over faded white zone */
          .m2c-slogan { text-shadow: 0 1px 12px rgba(0,0,0,0.95) !important; }
          .m2c-proof span { text-shadow: 0 1px 8px rgba(0,0,0,0.88) !important; }
          /* Hide desktop dark-bg blends inside student container; image mask handles it */
          .m2c-img-fade-tb, .m2c-img-fade-r { display: none !important; }
        }
        @media (max-width: 340px) {
          .m2c-tiles { grid-template-columns: 1fr !important; }
          .m2c-hero  { padding-bottom: 280px !important; }
        }

        /* ── Landscape mobile ── */
        @media (max-width: 900px) and (orientation: landscape) {
          .m2c-brand  { font-size: clamp(1.9rem, 7vw, 3.4rem) !important; }
          .m2c-slogan { font-size: clamp(0.72rem, 2vw, 1rem) !important; margin-top: 0.25rem !important; }
          .m2c-btn    { margin-top: 0.65rem !important; }
          .m2c-tile   { padding: 0.45rem 0.6rem !important; }
        }

        /* ── iOS safe areas ── */
        @supports (padding: env(safe-area-inset-bottom)) {
          .m2c-tiles {
            padding-bottom: calc(clamp(0.7rem, 1.8vh, 1.2rem) + env(safe-area-inset-bottom));
          }
        }

        /* ── Keyframes ── */
        @keyframes m2cUp {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes m2cFadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes m2cImgReveal {
          from { opacity: 0; transform: translateX(22px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes m2cTextureShift {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        @keyframes m2cFlagGlow {
          0%, 100% { filter: drop-shadow(0 2px 8px rgba(0,0,0,0.65)) brightness(1.1); }
          50%       { filter: drop-shadow(0 2px 14px rgba(255,255,255,0.28)) brightness(1.22); }
        }
        @keyframes m2cBgShift {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        @keyframes m2cDotPulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 1; }
        }
        @keyframes m2cShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

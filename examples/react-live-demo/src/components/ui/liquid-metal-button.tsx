import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
}

/**
 * Pure-CSS liquid metal button — no WebGL / shader dependencies.
 * Uses layered gradients, animated pseudo-elements and backdrop-filter
 * to recreate the molten-chrome look reliably across all browsers.
 */
export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const dimensions = useMemo(() => {
    if (viewMode === "icon") {
      return { width: 46, height: 46 };
    }
    return { width: 160, height: 46 };
  }, [viewMode]);

  /* ── Inject keyframes once ── */
  useEffect(() => {
    const styleId = "liquid-metal-css-anims";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes lm-shimmer {
          0%   { background-position: 200% 50%; }
          100% { background-position: -200% 50%; }
        }
        @keyframes lm-ripple {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.55; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        @keyframes lm-glow-pulse {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.75; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = { x, y, id: rippleId.current++ };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }
    onClick?.();
  };

  /* ── Computed styles ── */
  const outerGlow = isHovered
    ? "0 0 0 1px rgba(255,255,255,0.4), 0 8px 24px rgba(255,255,255,0.08), 0 2px 8px rgba(255,255,255,0.12)"
    : "0 0 0 1px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.5)";

  const metalGradient = isHovered
    ? "linear-gradient(135deg, #4a4a4a 0%, #8a8a8a 20%, #c0c0c0 35%, #ffffff 50%, #c0c0c0 65%, #8a8a8a 80%, #4a4a4a 100%)"
    : "linear-gradient(135deg, #2a2a2a 0%, #555 20%, #888 35%, #bbb 50%, #888 65%, #555 80%, #2a2a2a 100%)";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        aria-label={label}
        style={{
          position: "relative",
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          borderRadius: 100,
          border: "none",
          cursor: "pointer",
          outline: "none",
          overflow: "hidden",
          background: metalGradient,
          backgroundSize: "400% 100%",
          animation: "lm-shimmer 4s linear infinite",
          boxShadow: outerGlow,
          transform: isPressed ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.15s ease, box-shadow 0.3s ease, background 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {/* Inner dark overlay for contrast */}
        <span
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: 100,
            background: "linear-gradient(180deg, rgba(20,20,20,0.85) 0%, rgba(0,0,0,0.92) 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Animated shimmer highlight */}
        <span
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: 100,
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)",
            backgroundSize: "300% 100%",
            animation: "lm-shimmer 3s ease-in-out infinite",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Glow ring on hover */}
        {isHovered && (
          <span
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: 100,
              background: "transparent",
              boxShadow: "inset 0 0 12px rgba(255,255,255,0.15), 0 0 20px rgba(255,255,255,0.06)",
              animation: "lm-glow-pulse 2s ease-in-out infinite",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Button content */}
        {viewMode === "icon" ? (
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "relative", zIndex: 3, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
          >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        ) : (
          <span
            style={{
              position: "relative",
              zIndex: 3,
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,0.7)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        )}

        {/* Click ripples */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            style={{
              position: "absolute",
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
              animation: "lm-ripple 0.6s ease-out",
              zIndex: 4,
            }}
          />
        ))}
      </button>
    </div>
  );
}

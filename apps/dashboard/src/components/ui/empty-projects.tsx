"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { Plus } from "lucide-react";

export function EmptyProjectsState({ onCreateProject }: { onCreateProject: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 1rem' }}>
      <div style={{ marginBottom: '5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--white)', margin: 0 }}>
          Start Building with{" "}
          <motion.span
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            style={{ 
              position: 'relative', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.25rem 1rem', 
              borderRadius: '1rem', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#fff', 
              cursor: 'default'
            }}
          >
            Normy
            <motion.span
              animate={isHovered ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.7, repeat: isHovered ? Infinity : 0, ease: "easeInOut" }}
              style={{ display: 'inline-block' }}
            >
              ✨
            </motion.span>
          </motion.span>
        </h2>
      </div>

      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '20rem', height: '13rem', position: 'relative', cursor: 'pointer', marginBottom: '3rem', margin: '0 auto' }}
      >
        <div
          style={{
            position: 'relative',
            width: '87.5%',
            margin: '0 auto',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            borderRadius: '0.75rem',
            background: "#EBEBEB",
            border: "1px solid #D1D1D1",
          }}
        >
          {[
            {
              initial: { rotate: -3, x: -38, y: 2 },
              open: { rotate: -8, x: -70, y: -75 },
              transition: { type: "spring" as const, bounce: 0.15, stiffness: 160, damping: 22 },
              zIndex: 10,
            },
            {
              initial: { rotate: 0, x: 0, y: 0 },
              open: { rotate: 1, x: 2, y: -95 },
              transition: { type: "spring" as const, duration: 0.55, bounce: 0.12, stiffness: 190, damping: 24 },
              zIndex: 20,
            },
            {
              initial: { rotate: 3.5, x: 42, y: 1 },
              open: { rotate: 9, x: 75, y: -80 },
              transition: { type: "spring" as const, duration: 0.58, bounce: 0.17, stiffness: 170, damping: 21 },
              zIndex: 10,
            },
          ].map((page, i) => (
            <motion.div
              key={i}
              initial={page.initial}
              animate={isOpen ? page.open : page.initial}
              transition={page.transition}
              style={{
                position: 'absolute',
                top: '0.5rem',
                width: '8rem',
                height: 'fit-content',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: page.zIndex
              }}
            >
              <Page />
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={{ rotateX: isOpen ? -35 : 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '-1px',
            zIndex: 30,
            height: '11rem',
            borderRadius: '1.5rem',
            transformOrigin: 'bottom',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              viewBox="0 0 235 121"
              fill="none"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M104.615 0.350494L33.1297 0.838776C32.7542 0.841362 32.3825 0.881463 32.032 0.918854C31.6754 0.956907 31.3392 0.992086 31.0057 0.992096H31.0047C30.6871 0.99235 30.3673 0.962051 30.0272 0.929596C29.6927 0.897686 29.3384 0.863802 28.9803 0.866119L13.2693 0.967682H13.2527L13.2352 0.969635C13.1239 0.981406 13.0121 0.986674 12.9002 0.986237H9.91388C8.33299 0.958599 6.76052 1.22345 5.27423 1.76651H5.27325C4.33579 2.11246 3.48761 2.66213 2.7879 3.37393L2.49689 3.68839L2.492 3.69424C1.62667 4.73882 1.00023 5.96217 0.656067 7.27725C0.653324 7.28773 0.654065 7.29886 0.652161 7.30948C0.3098 8.62705 0.257231 10.0048 0.499817 11.3446L12.2147 114.399L12.2156 114.411L12.2176 114.423C12.6046 116.568 13.7287 118.508 15.3934 119.902C17.058 121.297 19.1572 122.056 21.3231 122.049V122.05H215.379C217.76 122.02 220.064 121.192 221.926 119.698V119.697C223.657 118.384 224.857 116.485 225.305 114.35L225.307 114.339L235.914 53.3798L235.968 53.1093L235.97 53.0985L235.971 53.0888C236.134 51.8978 236.044 50.685 235.705 49.5321C235.307 48.1669 234.63 46.9005 233.717 45.8144L233.383 45.4296C232.58 44.5553 231.614 43.8449 230.539 43.3398C229.311 42.7628 227.971 42.4685 226.616 42.4774H146.746C144.063 42.4705 141.423 41.8004 139.056 40.5263C136.691 39.2522 134.671 37.4127 133.175 35.1689L113.548 5.05948L113.544 5.05362L113.539 5.04776C112.545 3.65165 111.238 2.51062 109.722 1.72061C108.266 0.886502 106.627 0.422235 104.952 0.365143V0.364166L104.633 0.350494H104.615Z"
                fill="#F2F2F2"
                stroke="#D1D1D1"
                strokeWidth="1.5"
              />
            </svg>

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '2rem', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', gap: '2.75rem', marginBottom: '0.625rem' }}>
                <div style={{ width: '0.625rem', height: '0.625rem', background: 'rgba(82,82,82,0.4)', borderRadius: '9999px' }} />
                <div style={{ width: '0.625rem', height: '0.625rem', background: 'rgba(82,82,82,0.4)', borderRadius: '9999px' }} />
              </div>
              <div style={{ width: '2.25rem', height: '0.25rem', background: 'rgba(82,82,82,0.4)', borderRadius: '9999px' }} />
            </div>
          </div>
        </motion.div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <p style={{ fontSize: '1.25rem', color: 'var(--white)', letterSpacing: '-0.025em', margin: 0 }}>
          Oops.. You have no projects yet <br />
          <span style={{ color: 'var(--text-sec)', fontSize: '1.125rem', marginTop: '0.5rem', display: 'inline-block' }}>
            Create your first project to integrate AI validation
          </span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            onClick={onCreateProject}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '9999px', 
              border: '1px dashed rgba(255,255,255,0.2)', 
              background: 'transparent', 
              color: 'var(--white)', 
              cursor: 'pointer' 
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
          >
            <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} strokeWidth={3} />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 500 }}>
              Create Project
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

const Page = () => (
  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #ffffff, #F5F5F7)', borderRadius: '0.75rem', border: '1px solid #e5e5e5', padding: '1rem' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ width: '100%', height: '0.375rem', background: '#f5f5f5', borderRadius: '9999px' }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '0.375rem', background: '#f5f5f5', borderRadius: '9999px' }} />
          <div style={{ flex: 1, height: '0.375rem', background: '#f5f5f5', borderRadius: '9999px' }} />
        </div>
      ))}
    </div>
  </div>
);

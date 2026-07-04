"use client";

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';

export interface Contributor {
  username: string;
  avatarUrl: string;
  profileUrl?: string;
}

export interface ContributorsWallProps {
  title?: string;
  subtitle?: ReactNode;
  contributors: Contributor[];
  totalCount?: number;
  columns?: number;
  tilt?: number;
  perspective?: number;
  speed?: number;
  height?: number | string;
  className?: string;
}

interface TooltipState {
  username: string;
  left: number;
  top: number;
}

const GAP = 12;

function padToGrid(items: Contributor[], columns: number): Contributor[] {
  if (items.length === 0) return items;
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  const fill = columns - remainder;
  return items.concat(
    Array.from({ length: fill }, (_, i) => items[i % items.length]) as Contributor[]
  );
}

export function ContributorsWall({
  title = 'Contributors',
  subtitle,
  contributors,
  totalCount,
  columns = 16,
  tilt = 18,
  perspective = 1100,
  speed = 24,
  height = 300,
}: ContributorsWallProps) {
  const wallRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [blockHeight, setBlockHeight] = useState(0);

  const tiles = useMemo(
    () => padToGrid(contributors, columns),
    [contributors, columns],
  );
  const count = totalCount ?? contributors.length;

  useLayoutEffect(() => {
    const block = blockRef.current;
    if (!block) return;
    const measure = () => setBlockHeight(block.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(block);
    return () => ro.disconnect();
  }, [tiles, columns]);

  const y = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if (tooltip || blockHeight === 0) return;
    const wrap = blockHeight + GAP;
    let next = y.get() - (speed * delta) / 1000;
    if (next <= -wrap) next += wrap;
    y.set(next);
  });

  const handleEnter = (e: React.MouseEvent<HTMLElement>, username: string) => {
    const wall = wallRef.current;
    if (!wall) return;
    const tile = e.currentTarget.getBoundingClientRect();
    const box = wall.getBoundingClientRect();
    setTooltip({
      username,
      left: tile.left - box.left + tile.width / 2,
      top: tile.top - box.top,
    });
  };

  const planeStyle: CSSProperties = {
    transform: `rotateX(${tilt}deg)`,
    transformStyle: 'preserve-3d',
  };
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: GAP,
    width: '100%',
  };

  const renderGrid = (copy: number, ref?: React.Ref<HTMLDivElement>) => (
    <div ref={ref} style={gridStyle}>
      {tiles.map((c, i) => {
        const Tile = (c.profileUrl ? 'a' : 'div') as any;
        return (
          <Tile
            key={`${copy}-${c.username}-${i}`}
            {...(c.profileUrl
              ? { href: c.profileUrl, target: '_blank', rel: 'noreferrer' }
              : {})}
            aria-label={c.username}
            onMouseEnter={(e: any) => handleEnter(e, c.username)}
            style={{ position: 'relative', display: 'block', aspectRatio: '1 / 1', outline: 'none' }}
            className="group"
          >
            <span 
              className="absolute inset-0 overflow-hidden transition-transform duration-300 ease-out group-hover:z-20 group-focus-visible:z-20"
              style={{ borderRadius: '6px' }}
            >
              <img
                src={c.avatarUrl}
                alt={c.username}
                loading="lazy"
                draggable={false}
                style={{
                  height: '100%', width: '100%', userSelect: 'none', objectFit: 'cover',
                  filter: 'grayscale(100%) brightness(0.6)',
                  transition: 'all 0.3s ease'
                }}
                className="group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-125"
              />
              <span className="pointer-events-none absolute inset-0 rounded-[6px] ring-1 ring-inset ring-white/10 transition group-hover:ring-white/40" />
            </span>
          </Tile>
        );
      })}
    </div>
  );

  return (
    <div style={{ width: '100%', padding: '80px 24px', background: '#000', color: '#fff' }}>
      <div style={{ margin: '0 auto', maxWidth: '1024px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {title}
          </h2>
          <span style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <p style={{ marginTop: '8px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
          {subtitle ?? (
            <>
              Built by a community of{' '}
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                {count}+
              </span>{' '}
              contributors.
            </>
          )}
        </p>
      </div>

      <div
        ref={wallRef}
        style={{
          position: 'relative', margin: '32px auto 0', maxWidth: '1152px', overflow: 'hidden',
          perspective: `${perspective}px`, perspectiveOrigin: '50% 50%', height,
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <div style={{ height: '100%', ...planeStyle }}>
          <motion.div style={{ display: 'flex', width: '100%', flexDirection: 'column', y, gap: GAP }}>
            {renderGrid(0, blockRef)}
            {renderGrid(1)}
          </motion.div>
        </div>

        <div
          style={{
            pointerEvents: 'none', position: 'absolute', inset: 0,
            background: `
              radial-gradient(130% 95% at 50% 50%, transparent 30%, #000 82%),
              linear-gradient(to bottom, #000 0%, transparent 16%, transparent 84%, #000 100%),
              linear-gradient(to right, #000 0%, transparent 12%, transparent 88%, #000 100%)
            `,
          }}
        />

        {tooltip && (
          <div
            style={{
              pointerEvents: 'none', position: 'absolute', zIndex: 30,
              transform: 'translate(-50%, calc(-100% - 8px))',
              whiteSpace: 'nowrap', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
              background: '#161616', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 500, color: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              left: tooltip.left, top: tooltip.top
            }}
          >
            {tooltip.username}
            <span style={{
              position: 'absolute', left: '50%', top: '100%', height: '8px', width: '8px',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              borderBottom: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)',
              background: '#161616'
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

const handles = [
  'HenriqueBragaMoreira', 'alex_codes', 'mariadev', 'tom.builds', 'jin_woo',
  'sofia.ux', 'devkarl', 'nadia_r', 'liam.ts', 'ravi-shankar',
  'emma_oss', 'noah.dev', 'yuki_t', 'isabella', 'mohammed_a',
  'grace.hopper', 'leo_martin', 'priya.k', 'sven-ar', 'chloe.web',
  'daniel_kim', 'olga_v', 'hassan.dev', 'mila_w', 'arthur.js',
  'fatima_z', 'bruno.css', 'aiko_n', 'victor-h', 'lena.code',
  'omar_b', 'tara.gg', 'felix_m', 'nora_s', 'kenji.io',
  'paula_r', 'sami_dev', 'ingrid', 'pablo.ts', 'wei_chen',
];

const contributors: Contributor[] = Array.from({ length: 180 }, (_, i) => {
  const username = `${handles[i % handles.length]}${i >= handles.length ? `_${Math.floor(i / handles.length)}` : ''}`;
  return {
    username,
    avatarUrl: `https://i.pravatar.cc/120?u=${encodeURIComponent(username)}`,
    profileUrl: `https://github.com/${username}`,
  };
});

export default function ContributorsWallDemo() {
  return (
    <ContributorsWall
      title="Contributors"
      contributors={contributors}
      totalCount={871}
      columns={16}
      height={300}
    />
  );
}

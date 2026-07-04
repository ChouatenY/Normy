"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';

export interface AiHeroBackgroundProps {
  intensity?: 'normal' | 'high';
}

export function AiHeroBackground({ intensity = 'normal' }: AiHeroBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a mutable ref to track the current target speed so we can lerp to it smoothly
  const speedRef = useRef({ current: 0.5, target: intensity === 'high' ? 2.0 : 0.5 });

  // Update target speed when intensity prop changes
  useEffect(() => {
    speedRef.current.target = intensity === 'high' ? 2.5 : 0.5;
  }, [intensity]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    // Cleanup previous canvas if any
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0a0a0a, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // sleek near-black

    const camera = new THREE.OrthographicCamera();

    const renderPass = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.45, // slightly more bloom
      0.8,
      0.15
    );
    const rgbShift = new ShaderPass(RGBShiftShader);
    rgbShift.uniforms['amount']!.value = 0.0015;
    rgbShift.uniforms['angle']!.value = Math.PI / 4;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloom);
    composer.addPass(rgbShift);

    const GRID = {
      cols: 120,
      rows: 120,
      jitter: 0.3,
      hexOffset: 0.5,
      dotRadius: 0.03,
      spacing: 0.6
    };

    const total = GRID.cols * GRID.rows;
    const geometry = new THREE.CircleGeometry(GRID.dotRadius, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dots = new THREE.InstancedMesh(geometry, material, total);
    dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(dots);

    const basePos = new Float32Array(total * 2);
    const distArr = new Float32Array(total);

    let xOffset = (GRID.cols - 1) * GRID.spacing * 0.5;
    let yOffset = (GRID.rows - 1) * GRID.spacing * 0.5;

    let idx = 0;
    const dummy = new THREE.Object3D();

    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++, idx++) {
        let x = c * GRID.spacing - xOffset;
        let y = r * GRID.spacing - yOffset;
        y += (c % 2) * GRID.hexOffset * GRID.spacing;
        x += (Math.random() - 0.5) * GRID.jitter;
        y += (Math.random() - 0.5) * GRID.jitter;
        basePos[idx * 2 + 0] = x;
        basePos[idx * 2 + 1] = y;
        const len = Math.hypot(x, y);
        const ang = Math.atan2(y, x);
        const oct = 0.5 * Math.cos(ang * 8.0);
        distArr[idx] = len + oct * 0.75;
        dummy.position.set(x, y, 0);
        dummy.updateMatrix();
        dots.setMatrixAt(idx, dummy.matrix);
      }
    }

    function roundedSquareWave(t: number, delta: number, a: number, f: number) {
      return ((2 * a) / Math.PI) * Math.atan(Math.sin(2 * Math.PI * t * f) / delta);
    }

    const clock = new THREE.Clock();
    let animationFrameId: number;
    let accumulatedTime = 0;
    let lastTime = clock.getElapsedTime();

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      
      const currentTime = clock.getElapsedTime();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Smoothly interpolate the speed
      speedRef.current.current += (speedRef.current.target - speedRef.current.current) * 0.05;
      
      accumulatedTime += deltaTime * speedRef.current.current;

      const t = accumulatedTime;
      const amp = 0.75;
      const freq = 0.3;
      const falloff = 0.035;
      
      const phase = (Math.sin(2 * Math.PI * t * freq) + 1) * 0.5;
      
      // Also shift RGB intensity based on speed
      const intensityFactor = Math.max(1, speedRef.current.current / 0.5);
      rgbShift.uniforms['amount']!.value = (0.001 + phase * 0.0025) * intensityFactor;
      
      const mat = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      
      for (let i = 0; i < total; i++) {
        const x0 = basePos[i * 2 + 0] as number;
        const y0 = basePos[i * 2 + 1] as number;
        const dist = distArr[i] as number;
        const localDelta = THREE.MathUtils.lerp(0.05, 0.2, Math.min(1.0, dist / 70.0));
        
        const tt = t - dist * falloff;
        const k = 1 + roundedSquareWave(tt, localDelta, amp, freq);
        
        pos.set(x0 * k, y0 * k, 0);
        mat.set(
          1, 0, 0, pos.x,
          0, 1, 0, pos.y,
          0, 0, 1, 0,
          0, 0, 0, 1
        );
        dots.setMatrixAt(i, mat);
      }
      
      dots.instanceMatrix.needsUpdate = true;
      composer.render();
    }

    const resizeCamera = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w / h;
      const worldHeight = 10;
      const worldWidth = worldHeight * aspect;

      camera.left = -worldWidth / 2;
      camera.right = worldWidth / 2;
      camera.top = worldHeight / 2;
      camera.bottom = -worldHeight / 2;
      camera.near = -100;
      camera.far = 100;
      camera.position.set(0, 0, 10);
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
      composer.setSize(w, h);
      if (rgbShift.uniforms['resolution']) {
        rgbShift.uniforms['resolution']!.value.set(w, h);
      }
      bloom.setSize(w, h);
    };

    const observer = new ResizeObserver(() => resizeCamera());
    observer.observe(container);

    resizeCamera();
    animate();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrameId);
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.6 // Subtle blending
      }}
    />
  );
}

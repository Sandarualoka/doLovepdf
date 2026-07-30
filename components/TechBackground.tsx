"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseTime: number;
  type: "dot" | "cross" | "code";
  char?: string;
}

export default function TechBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null; targetX: number | null; targetY: number | null }>({
    x: null,
    y: null,
    targetX: null,
    targetY: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    // Theme colors matching the design system
    const colors = [
      "#4F46E5", // Indigo
      "#E91E63", // Magenta
      "#06B6D4", // Cyan
      "#6C2BD9", // Purple
    ];

    const chars = ["0", "1"];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      // Adjust canvas resolution for high-DPI displays
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      initParticles();
    };

    const initParticles = () => {
      // Scale count based on resolution, capping it for performance
      const particleDensity = 16000; // pixels per particle
      const targetCount = Math.min(90, Math.max(30, Math.floor((width * height) / particleDensity)));
      
      particles = [];
      for (let i = 0; i < targetCount; i++) {
        const typeRand = Math.random();
        let type: "dot" | "cross" | "code" = "dot";
        if (typeRand > 0.85) {
          type = "code";
        } else if (typeRand > 0.7) {
          type = "cross";
        }

        const baseAlpha = 0.15 + Math.random() * 0.2;

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          size: 1 + Math.random() * 2.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: baseAlpha,
          baseAlpha,
          pulseSpeed: 0.01 + Math.random() * 0.02,
          pulseTime: Math.random() * Math.PI * 2,
          type,
          char: type === "code" ? chars[Math.floor(Math.random() * chars.length)] : undefined,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = null;
      mouseRef.current.targetY = null;
    };

    // Set up listeners
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    // Initial setup
    resize();

    // Subtle grid settings
    const gridSize = 90;
    let gridOffset = 0;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation for liquid/lagging cursor connection feel
      const mouse = mouseRef.current;
      if (mouse.targetX !== null && mouse.targetY !== null) {
        if (mouse.x === null || mouse.y === null) {
          mouse.x = mouse.targetX;
          mouse.y = mouse.targetY;
        } else {
          mouse.x += (mouse.targetX - mouse.x) * 0.1;
          mouse.y += (mouse.targetY - mouse.y) * 0.1;
        }
      } else {
        mouse.x = null;
        mouse.y = null;
      }

      // Draw faint, scrolling grid in background
      gridOffset = (gridOffset + 0.05) % gridSize;
      ctx.strokeStyle = "rgba(79, 70, 229, 0.02)";
      ctx.lineWidth = 0.5;

      // Draw vertical grid lines
      for (let x = -gridSize + gridOffset; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Draw small ticks/intersections
        for (let y = -gridSize + gridOffset; y < height; y += gridSize) {
          ctx.fillStyle = "rgba(79, 70, 229, 0.05)";
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }

      // Draw horizontal grid lines
      for (let y = -gridSize + gridOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and draw particles
      particles.forEach((p) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulsing alpha
        p.pulseTime += p.pulseSpeed;
        const pulse = Math.sin(p.pulseTime) * 0.08;
        p.alpha = Math.max(0.05, p.baseAlpha + pulse);

        // Hover reaction (mouse proximity)
        let mouseInfluence = 0;
        if (mouse.x !== null && mouse.y !== null) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 200;

          if (dist < maxDist) {
            mouseInfluence = 1 - dist / maxDist;
            p.alpha = Math.min(1.0, p.alpha + mouseInfluence * 0.45);
          }
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        if (p.type === "cross") {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - 4, p.y);
          ctx.lineTo(p.x + 4, p.y);
          ctx.moveTo(p.x, p.y - 4);
          ctx.lineTo(p.x, p.y + 4);
          ctx.stroke();
        } else if (p.type === "code") {
          ctx.font = "bold 9px monospace";
          ctx.fillText(p.char || "0", p.x - 3, p.y + 3);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow effect for larger nodes
          if (p.size > 2.5 || mouseInfluence > 0.5) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + 1.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
        }
        ctx.restore();
      });

      // Draw constellation connections
      const maxConnDist = 120;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnDist) {
            const alpha = (1 - dist / maxConnDist) * 0.09;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Create a gradient line between two particles if they are close
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, p1.color);
            grad.addColorStop(1, p2.color);
            ctx.strokeStyle = grad;
            
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Draw connections to mouse
      if (mouse.x !== null && mouse.y !== null) {
        particles.forEach((p) => {
          const dx = p.x - mouse.x!;
          const dy = p.y - mouse.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxMouseConn = 180;

          if (dist < maxMouseConn) {
            const alpha = (1 - dist / maxMouseConn) * 0.16;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x!, mouse.y!);

            const grad = ctx.createLinearGradient(p.x, p.y, mouse.x!, mouse.y!);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, "#06B6D4"); // Glow towards a cyan cursor
            ctx.strokeStyle = grad;

            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}

"use client"

import type React from "react"

import { motion } from "framer-motion"
import { useState } from "react"

type WoodenBlockProps = {
  id: number
  health: number
  maxHealth: number
  x: number
  y: number
  size: number
  rotation: number
  onTap: (id: number, event: React.MouseEvent | React.TouchEvent) => void
}

export function WoodenBlock({ id, health, maxHealth, x, y, size, rotation, onTap }: WoodenBlockProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Different wood textures based on health percentage
  const getWoodTexture = () => {
    const healthPercentage = (health / maxHealth) * 100
    if (healthPercentage > 66) {
      return "bg-[url('/wood-texture-dark.png')]"
    } else if (healthPercentage > 33) {
      return "bg-[url('/wood-texture-medium.png')]"
    } else {
      return "bg-[url('/wood-texture-light.png')]"
    }
  }

  // Wood grain overlay
  const getWoodGrain = () => {
    return "bg-[url('/wood-grain.png')]"
  }

  return (
    <motion.div
      initial={{ scale: 0, rotate: rotation }}
      animate={{
        scale: 1,
        rotate: rotation,
        x: [x - 2, x + 2, x],
        y: [y - 1, y + 1, y],
      }}
      exit={{ scale: 0, rotate: rotation + 180 }}
      transition={{
        duration: 0.3,
        x: { repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" },
        y: { repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "easeInOut" },
      }}
      className="absolute cursor-pointer rounded-md shadow-lg"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => onTap(id, e)}
      onTouchStart={(e) => onTap(id, e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative w-full h-full flex items-center justify-center rounded-md overflow-hidden ${
          isHovered ? "brightness-110" : "brightness-100"
        } transition-all duration-200`}
      >
        {/* Base wood texture */}
        <div className={`absolute inset-0 ${getWoodTexture()} bg-cover`}></div>

        {/* Wood grain overlay */}
        <div className={`absolute inset-0 ${getWoodGrain()} bg-cover opacity-30`}></div>

        {/* Wood cracks based on damage */}
        {health < maxHealth * 0.7 && (
          <div className="absolute inset-0 bg-[url('/wood-crack-1.png')] bg-cover opacity-40"></div>
        )}
        {health < maxHealth * 0.4 && (
          <div className="absolute inset-0 bg-[url('/wood-crack-2.png')] bg-cover opacity-50"></div>
        )}

        {/* Health indicator */}
        <div className="z-10 font-bold text-white text-xl drop-shadow-md">{health}</div>

        {/* Wood border */}
        <div className="absolute inset-0 border-4 border-[#5d4037] rounded-md opacity-70"></div>
      </div>
    </motion.div>
  )
}

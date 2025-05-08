"use client"

import { motion } from "framer-motion"

type TreeProps = {
  size: number
  x: number
  y: number
  delay: number
}

export function Tree({ size, x, y, delay }: TreeProps) {
  const trunkHeight = size * 0.4
  const trunkWidth = size * 0.2
  const leafSize = size * 0.8

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${x}px`,
        top: `${y - size}px`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 1 }}
    >
      {/* Tree trunk */}
      <motion.div
        className="absolute bg-gradient-to-b from-amber-800 to-amber-900 rounded-md"
        style={{
          width: `${trunkWidth}px`,
          height: `${trunkHeight}px`,
          left: `${(size - trunkWidth) / 2}px`,
          top: `${size - trunkHeight}px`,
        }}
        animate={{
          skewX: [0, 1, 0, -1, 0],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {/* Wood grain */}
        <div className="absolute inset-0 bg-[url('/wood-grain.png')] bg-cover opacity-30 rounded-md"></div>
      </motion.div>

      {/* Tree leaves */}
      <motion.div
        className="absolute bg-gradient-to-b from-green-700 to-green-900 rounded-full"
        style={{
          width: `${leafSize}px`,
          height: `${leafSize}px`,
          left: `${(size - leafSize) / 2}px`,
          top: `${(size - leafSize) / 2 - trunkHeight * 0.3}px`,
        }}
        animate={{
          scale: [1, 1.02, 1, 0.98, 1],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 3,
          ease: "easeInOut",
          delay: delay + 0.5,
        }}
      >
        {/* Leaf texture */}
        <div className="absolute inset-0 bg-[url('/leaf-texture.png')] bg-cover opacity-30 rounded-full"></div>
      </motion.div>
    </motion.div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { Hammer, Trophy, Timer, Star, ArrowRight } from "lucide-react"
import confetti from "canvas-confetti"
import { WoodenBlock } from "./wooden-block"
import { Tree } from "./tree"

// Block type
type Block = {
  id: number
  health: number
  maxHealth: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  row: number
  column: number
}

// Level configuration
type LevelConfig = {
  blockCount: number
  blockHealth: number
  timeLimit: number
  rows: number
  columns: number
}

export default function BlockBreaker() {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [blocksDestroyed, setBlocksDestroyed] = useState(0)
  const [totalBlocksDestroyed, setTotalBlocksDestroyed] = useState(0)
  const [isLevelComplete, setIsLevelComplete] = useState(false)
  const [isGameComplete, setIsGameComplete] = useState(false)
  const [showTutorial, setShowTutorial] = useState(true)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const hammerRef = useRef<HTMLDivElement>(null)
  const [hammerPosition, setHammerPosition] = useState({ x: 0, y: 0 })
  const [isHammerActive, setIsHammerActive] = useState(false)
  const [lastTapPosition, setLastTapPosition] = useState({ x: 0, y: 0 })

  // Wood colors
  const woodColors = ["bg-amber-800", "bg-amber-700", "bg-yellow-900", "bg-yellow-800", "bg-amber-900"]

  // Level configurations
  const getLevelConfig = (level: number): LevelConfig => {
    // Increase complexity with level
    const baseBlocks = 6
    const additionalBlocks = Math.min(level * 2, 20)
    const totalBlocks = baseBlocks + additionalBlocks

    // Determine grid size based on level
    let rows = 2
    let columns = 3

    if (level > 3) {
      rows = 3
      columns = 4
    }
    if (level > 6) {
      rows = 4
      columns = 5
    }

    return {
      blockCount: totalBlocks,
      blockHealth: Math.ceil(level * 1.2),
      timeLimit: 10, // 10 seconds per level
      rows,
      columns,
    }
  }

  // Initialize level
  const initializeLevel = () => {
    if (level > 10) {
      // Game completed
      setIsGameComplete(true)
      setGameOver(true)
      celebrateWin()
      return
    }

    const config = getLevelConfig(level)
    const newBlocks: Block[] = []
    const gameArea = gameAreaRef.current

    if (gameArea) {
      const width = gameArea.clientWidth
      const height = gameArea.clientHeight

      // Calculate block size based on available space and grid
      const blockWidth = Math.min(width / (config.columns + 1), 70)
      const blockHeight = Math.min(height / (config.rows + 2), 70)
      const blockSize = Math.min(blockWidth, blockHeight)

      // Calculate starting position for the stack (centered)
      const startX = (width - config.columns * blockSize) / 2
      const startY = height - config.rows * blockSize - 100 // Leave space at bottom

      // Create blocks in a stacked formation
      let blockId = 0
      for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.columns; col++) {
          if (blockId < config.blockCount) {
            // Add some randomness to make it look more natural
            const offsetX = Math.random() * 5 - 2.5
            const offsetY = Math.random() * 5 - 2.5

            newBlocks.push({
              id: blockId,
              health: config.blockHealth,
              maxHealth: config.blockHealth,
              x: startX + col * blockSize + offsetX,
              y: startY - row * blockSize + offsetY,
              size: blockSize,
              color: woodColors[Math.floor(Math.random() * woodColors.length)],
              rotation: Math.floor(Math.random() * 6) - 3,
              row,
              column: col,
            })
            blockId++
          }
        }
      }
    }

    setBlocks(newBlocks)
    setBlocksDestroyed(0)
    setTimeLeft(config.timeLimit)
    setIsLevelComplete(false)
  }

  // Start game
  const startGame = () => {
    setGameStarted(true)
    setGameOver(false)
    setLevel(1)
    setScore(0)
    setTotalBlocksDestroyed(0)
    setShowTutorial(false)
    initializeLevel()
  }

  // Start next level
  const startNextLevel = () => {
    setLevel(level + 1)
    setIsLevelComplete(false)
    initializeLevel()
  }

  // Handle block tap/click
  const handleBlockTap = (blockId: number, event: React.MouseEvent | React.TouchEvent) => {
    if (gameOver || isLevelComplete) return

    // Get tap position
    let clientX: number, clientY: number

    if ("touches" in event) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }

    setLastTapPosition({ x: clientX, y: clientY })

    // Animate hammer
    setHammerPosition({ x: clientX, y: clientY })
    setIsHammerActive(true)
    setTimeout(() => setIsHammerActive(false), 200)

    // Update block health
    const updatedBlocks = blocks.map((block) => {
      if (block.id === blockId) {
        const newHealth = block.health - 1

        // If block is destroyed
        if (newHealth <= 0) {
          setBlocksDestroyed((prev) => prev + 1)
          setTotalBlocksDestroyed((prev) => prev + 1)
          setScore((prev) => prev + level * 10)
          return { ...block, health: 0 }
        }

        return { ...block, health: newHealth }
      }
      return block
    })

    setBlocks(updatedBlocks)

    // Check if level is complete
    const remainingBlocks = updatedBlocks.filter((block) => block.health > 0)
    if (remainingBlocks.length === 0) {
      setIsLevelComplete(true)
      setTimeLeft(0)

      // Small celebration for completing a level
      if (level < 10) {
        const { x, y } = lastTapPosition
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { x: x / window.innerWidth, y: y / window.innerHeight },
        })
      }
    }
  }

  // Celebrate winning the game
  const celebrateWin = () => {
    // Big celebration for completing the game
    const duration = 3 * 1000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#8B4513", "#A0522D", "#CD853F"],
      })

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#8B4513", "#A0522D", "#CD853F"],
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameStarted && !gameOver && !isLevelComplete && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)

        if (timeLeft === 1) {
          // Time's up
          setGameOver(true)
        }
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameStarted, gameOver, isLevelComplete, timeLeft])

  // Initialize level when component mounts or level changes
  useEffect(() => {
    if (gameStarted && !gameOver) {
      initializeLevel()
    }
  }, [level, gameStarted])

  // Calculate level progress
  const levelProgress = (blocksDestroyed / (blocks.length || 1)) * 100

  return (
    <div className="flex flex-col items-center w-full h-screen max-w-md mx-auto">
      {!gameStarted ? (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 text-white relative overflow-hidden">
          {/* Animated Trees Background */}
          <div className="absolute inset-0 overflow-hidden">
            <Tree size={120} x={-20} y={window.innerHeight - 180} delay={0} />
            <Tree size={150} x={window.innerWidth - 150} y={window.innerHeight - 200} delay={0.5} />
            <Tree size={100} x={window.innerWidth / 2 - 50} y={window.innerHeight - 150} delay={1} />
            <Tree size={80} x={window.innerWidth / 4} y={window.innerHeight - 120} delay={1.5} />
            <Tree size={90} x={(window.innerWidth / 4) * 3} y={window.innerHeight - 130} delay={2} />
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center z-10"
          >
            <h1 className="text-5xl font-bold mb-4 text-amber-300 drop-shadow-lg">บล็อคไม้!</h1>
            <p className="text-xl mb-8">ตีบล็อคไม้ให้แตก! เร็ว! เร็ว!</p>

            <div className="bg-white/20 backdrop-blur-sm p-6 rounded-xl mb-8">
              <h2 className="text-2xl font-bold mb-4 text-yellow-200">วิธีเล่น</h2>
              <ul className="text-left space-y-2">
                <li className="flex items-center">
                  <Hammer className="mr-2 h-5 w-5 text-yellow-300" />
                  แตะที่บล็อคเพื่อตีให้แตก
                </li>
                <li className="flex items-center">
                  <Timer className="mr-2 h-5 w-5 text-yellow-300" />
                  มีเวลา 10 วินาทีในแต่ละด่าน
                </li>
                <li className="flex items-center">
                  <Star className="mr-2 h-5 w-5 text-yellow-300" />
                  ทำลายบล็อคทั้งหมดเพื่อผ่านด่าน
                </li>
                <li className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-yellow-300" />
                  ผ่านให้ครบ 10 ด่าน!
                </li>
              </ul>
            </div>

            <Button
              onClick={startGame}
              className="bg-gradient-to-r from-amber-700 to-yellow-900 hover:from-amber-800 hover:to-yellow-950 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transform transition hover:scale-105"
            >
              เริ่มเกม!
            </Button>
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full">
          {/* Game header */}
          <div className="bg-black/30 backdrop-blur-sm p-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-300 mr-1" />
                <span className="font-bold">ด่าน {level}/10</span>
              </div>
              <div className="flex items-center">
                <Trophy className="h-5 w-5 text-yellow-300 mr-1" />
                <span className="font-bold">{score}</span>
              </div>
              <div className="flex items-center">
                <Timer className="h-5 w-5 text-red-400 mr-1" />
                <span className="font-bold text-red-400">{timeLeft}s</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs">ความคืบหน้า:</span>
              <Progress value={levelProgress} className="h-2 flex-1" />
              <span className="text-xs">{Math.floor(levelProgress)}%</span>
            </div>
          </div>

          {/* Game area */}
          <div ref={gameAreaRef} className="flex-1 relative overflow-hidden">
            {/* Blocks */}
            <AnimatePresence>
              {blocks.map(
                (block) =>
                  block.health > 0 && (
                    <WoodenBlock
                      key={block.id}
                      id={block.id}
                      health={block.health}
                      maxHealth={block.maxHealth}
                      x={block.x}
                      y={block.y}
                      size={block.size}
                      rotation={block.rotation}
                      onTap={handleBlockTap}
                    />
                  ),
              )}
            </AnimatePresence>

            {/* Hammer animation */}
            <AnimatePresence>
              {isHammerActive && (
                <motion.div
                  initial={{ scale: 1.5, opacity: 1, rotate: -45 }}
                  animate={{ scale: 0.8, opacity: 0, rotate: 15 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${hammerPosition.x - 25}px`,
                    top: `${hammerPosition.y - 25}px`,
                  }}
                >
                  <Hammer size={50} className="text-gray-800" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tutorial overlay */}
            {showTutorial && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                <div className="bg-white/20 backdrop-blur-md p-6 rounded-xl max-w-xs text-white">
                  <h3 className="text-xl font-bold mb-4 text-center">แตะที่บล็อคเพื่อตีให้แตก!</h3>
                  <p className="mb-4 text-center">ทำลายบล็อคทั้งหมดภายใน 10 วินาที</p>
                  <Button
                    onClick={() => setShowTutorial(false)}
                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-800"
                  >
                    เข้าใจแล้ว!
                  </Button>
                </div>
              </div>
            )}

            {/* Level complete overlay */}
            {isLevelComplete && !isGameComplete && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white/20 backdrop-blur-md p-6 rounded-xl max-w-xs text-white text-center"
                >
                  <h3 className="text-2xl font-bold mb-2">ด่าน {level} สำเร็จ!</h3>
                  <p className="mb-4">คุณทำลายบล็อคได้ {blocksDestroyed} ชิ้น</p>
                  <p className="text-yellow-300 font-bold mb-6">+{level * 10 * blocksDestroyed} คะแนน</p>

                  <Button
                    onClick={startNextLevel}
                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-800 flex items-center justify-center"
                  >
                    ไปด่านต่อไป <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Game over overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white/20 backdrop-blur-md p-6 rounded-xl max-w-xs text-white text-center"
                >
                  {isGameComplete ? (
                    <>
                      <h3 className="text-3xl font-bold mb-4 text-yellow-300">ยินดีด้วย!</h3>
                      <p className="text-xl mb-2">คุณผ่านทั้ง 10 ด่านแล้ว!</p>
                      <p className="mb-6">คะแนนรวม: {score}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold mb-4 text-red-400">หมดเวลา!</h3>
                      <p className="mb-2">คุณมาถึงด่าน {level}</p>
                      <p className="mb-6">คะแนนรวม: {score}</p>
                    </>
                  )}

                  <Button onClick={startGame} className="w-full bg-gradient-to-r from-amber-700 to-yellow-900">
                    เล่นใหม่
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

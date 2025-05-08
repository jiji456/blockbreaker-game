"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Physics, useBox, usePlane } from "@react-three/cannon"
import { OrbitControls, PerspectiveCamera, Text, Center, Float, Stars } from "@react-three/drei"
import { Bloom, EffectComposer } from "@react-three/postprocessing"
import type * as THREE from "three"

// Block type
type Block3DProps = {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  health: number
  maxHealth: number
  id: number
  onDestroy: (id: number) => void
  onDamage: (id: number) => void
}

// Level configuration
type LevelConfig = {
  blockCount: number
  blockHealth: number
  timeLimit: number
  rows: number
  columns: number
  layers: number
}

// Wood colors
const woodColors = ["#8B4513", "#A0522D", "#CD853F", "#D2691E", "#8B5A2B"]

// Floor component
function Floor(props: any) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#5D4037" />
    </mesh>
  )
}

// 3D Block component
function Block3D({
  position,
  size,
  color,
  health,
  maxHealth,
  id,
  onDestroy,
  onDamage,
  onHit,
}: Block3DProps & { onHit: (position: [number, number, number]) => void }) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: size,
  }))

  const [localHealth, setLocalHealth] = useState(health)
  const [isHovered, setIsHovered] = useState(false)
  const [isHit, setIsHit] = useState(false)

  // Get color based on health percentage
  const getWoodColor = () => {
    const healthPercentage = (localHealth / maxHealth) * 100
    if (healthPercentage > 66) {
      return "#8B4513" // Dark brown
    } else if (healthPercentage > 33) {
      return "#A0522D" // Medium brown
    } else {
      return "#CD853F" // Light brown
    }
  }

  // Handle click/tap
  const handleClick = (e: any) => {
    e.stopPropagation()
    setIsHit(true)

    // Apply force to make it look like it was hit
    api.applyImpulse([0, 5, 0], [0, 0, 0])

    // Trigger hit effect at this position
    onHit(position)

    // Reduce health
    const newHealth = localHealth - 1
    setLocalHealth(newHealth)

    if (newHealth <= 0) {
      // Block destroyed
      onDestroy(id)
    } else {
      // Block damaged
      onDamage(id)
    }

    // Reset hit animation
    setTimeout(() => setIsHit(false), 300)
  }

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
      scale={isHit ? 0.9 : isHovered ? 1.05 : 1}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={getWoodColor()}
        roughness={0.7}
        metalness={0.1}
        emissive={isHit ? "#ff9500" : isHovered ? "#ffcc00" : "#000000"}
        emissiveIntensity={isHit ? 0.5 : isHovered ? 0.2 : 0}
      />

      {/* Health indicator as 3D text */}
      <Text
        position={[0, 0, size[2] / 2 + 0.01]}
        rotation={[0, 0, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {localHealth.toString()}
      </Text>
    </mesh>
  )
}

// Hit effect component
function HitEffect({ position, intensity = 1 }: { position: [number, number, number]; intensity?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const scale = 1 + (clock.getElapsedTime() % 1) * intensity
      groupRef.current.scale.set(scale, scale, scale)
    }
  })

  if (!visible) return null

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={2 * intensity}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}

// Tree component for the start screen
function Tree3D({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const trunkRef = useRef<any>()
  const leavesRef = useRef<any>()

  // Animate the tree
  useFrame(({ clock }) => {
    if (trunkRef.current) {
      trunkRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.1
      trunkRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.2) * 0.05
    }
    if (leavesRef.current) {
      leavesRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.15
      leavesRef.current.scale.set(
        1 + Math.sin(clock.getElapsedTime() * 0.5) * 0.05,
        1 + Math.sin(clock.getElapsedTime() * 0.7) * 0.05,
        1 + Math.sin(clock.getElapsedTime() * 0.6) * 0.05,
      )
      leavesRef.current.position.y = 1.5 + Math.sin(clock.getElapsedTime() * 0.5) * 0.1
    }
  })

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh ref={trunkRef} castShadow receiveShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1.5, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>

      {/* Leaves */}
      <mesh ref={leavesRef} castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Level indicator
function LevelIndicator({ level }: { level: number }) {
  return (
    <group position={[0, 0.5, -5]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
        >
          {`LEVEL ${level}`}
        </Text>
      </Float>
    </group>
  )
}

// Score indicator
function ScoreIndicator({ score }: { score: number }) {
  return (
    <group position={[4, 0.5, -5]}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <Text
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.4}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
        >
          {`${score}`}
        </Text>
        <mesh position={[-1, 0, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
        </mesh>
      </Float>
    </group>
  )
}

// Timer indicator
function TimerIndicator({ time }: { time: number }) {
  return (
    <group position={[-4, 0.5, -5]}>
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
        <Text
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.4}
          color={time <= 3 ? "#FF0000" : "#FFFFFF"}
          anchorX="center"
          anchorY="middle"
        >
          {`${time}s`}
        </Text>
        <mesh position={[-1, 0, 0]}>
          <torusGeometry args={[0.2, 0.05, 16, 32]} />
          <meshStandardMaterial
            color={time <= 3 ? "#FF0000" : "#FFFFFF"}
            emissive={time <= 3 ? "#FF0000" : "#FFFFFF"}
            emissiveIntensity={time <= 3 ? 0.8 : 0.5}
          />
        </mesh>
      </Float>
    </group>
  )
}

// Game scene
function GameScene({
  level,
  score,
  timeLeft,
  blocks,
  onBlockDestroy,
  onBlockDamage,
  clickIntensity,
  onBlockHit,
}: {
  level: number
  score: number
  timeLeft: number
  blocks: any[]
  onBlockDestroy: (id: number) => void
  onBlockDamage: (id: number) => void
  clickIntensity: number
  onBlockHit: (position: [number, number, number]) => void
}) {
  const { camera } = useThree()
  const [hitEffects, setHitEffects] = useState<{ id: number; position: [number, number, number] }[]>([])
  const effectIdCounter = useRef(0)
  const cameraShakeRef = useRef({ x: 0, y: 0, intensity: 0 })

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 10, 10)
    camera.lookAt(0, 0, 0)
  }, [camera])

  // Handle camera shake and movement
  useFrame(({ clock }) => {
    if (cameraShakeRef.current.intensity > 0) {
      // Apply camera shake
      const shake = Math.sin(clock.getElapsedTime() * 20) * cameraShakeRef.current.intensity
      camera.position.x += (cameraShakeRef.current.x + shake * 0.1 - camera.position.x) * 0.1
      camera.position.y += (10 + shake * 0.05 - camera.position.y) * 0.1
      camera.position.z += (10 + shake * 0.05 - camera.position.z) * 0.1

      // Gradually reduce shake intensity
      cameraShakeRef.current.intensity *= 0.95
      if (cameraShakeRef.current.intensity < 0.01) {
        cameraShakeRef.current.intensity = 0
      }
    } else {
      // Smooth return to original position
      camera.position.x += (0 - camera.position.x) * 0.05
      camera.position.y += (10 - camera.position.y) * 0.05
      camera.position.z += (10 - camera.position.z) * 0.05
    }

    // Always look at center
    camera.lookAt(0, 0, 0)
  })

  // Handle block hit
  const handleBlockHit = (position: [number, number, number]) => {
    // Add hit effect
    const newEffectId = effectIdCounter.current++
    setHitEffects((prev) => [...prev, { id: newEffectId, position }])

    // Remove effect after animation
    setTimeout(() => {
      setHitEffects((prev) => prev.filter((effect) => effect.id !== newEffectId))
    }, 800)

    // Apply camera shake
    cameraShakeRef.current = {
      x: position[0] * 0.1,
      y: 0,
      intensity: 0.2 * clickIntensity,
    }

    // Pass to parent component
    onBlockHit(position)
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Hit effects */}
      {hitEffects.map((effect) => (
        <ParticleEffect key={effect.id} position={effect.position} intensity={clickIntensity} />
      ))}

      <Physics>
        <Floor position={[0, -0.5, 0]} />

        {/* Game blocks */}
        {blocks.map((block) => (
          <Block3D
            key={block.id}
            id={block.id}
            position={block.position}
            size={block.size}
            color={block.color}
            health={block.health}
            maxHealth={block.maxHealth}
            onDestroy={onBlockDestroy}
            onDamage={onBlockDamage}
            onHit={handleBlockHit}
          />
        ))}
      </Physics>

      {/* Game UI elements */}
      <LevelIndicator level={level} />
      <ScoreIndicator score={score} />
      <TimerIndicator time={timeLeft} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </>
  )
}

// Start screen scene
function StartScene({ onStartGame }: { onStartGame: () => void }) {
  const { camera } = useThree()
  const cameraRef = useRef({ x: 0, y: 5, z: 10 })

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Animate camera
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()

    // Gentle camera movement
    camera.position.x = Math.sin(time * 0.2) * 2
    camera.position.y = 5 + Math.sin(time * 0.1) * 0.5
    camera.position.z = 10 + Math.cos(time * 0.15) * 1

    camera.lookAt(0, 2, 0)
  })

  // Handle click to start game
  const handleClick = () => {
    onStartGame()
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Title */}
      <group position={[0, 4, 0]} onClick={handleClick}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={1}
              color="#FFD700"
              anchorX="center"
              anchorY="middle"
            >
              BLOCK BREAKER
            </Text>
          </Float>
        </Center>
      </group>

      {/* Start button */}
      <group position={[0, 2, 0]} onClick={handleClick}>
        <Center>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.7}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
            >
              TAP TO START
            </Text>
          </Float>
        </Center>
      </group>

      {/* Decorative trees */}
      <Tree3D position={[-5, -0.5, -2]} scale={1.2} />
      <Tree3D position={[5, -0.5, -3]} scale={1.5} />
      <Tree3D position={[-3, -0.5, -5]} scale={1} />
      <Tree3D position={[4, -0.5, -4]} scale={1.3} />
      <Tree3D position={[0, -0.5, -6]} scale={1.4} />

      {/* Floor */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>

      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} minPolarAngle={Math.PI / 6} />
    </>
  )
}

// Level complete scene
function LevelCompleteScene({ level, score, onNextLevel }: { level: number; score: number; onNextLevel: () => void }) {
  const { camera } = useThree()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Handle click to go to next level
  const handleClick = () => {
    onNextLevel()
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Level complete text */}
      <group position={[0, 4, 0]}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.8}
              color="#FFD700"
              anchorX="center"
              anchorY="middle"
            >
              {`LEVEL ${level} COMPLETE!`}
            </Text>
          </Float>
        </Center>
      </group>

      {/* Score */}
      <group position={[0, 2.5, 0]}>
        <Center>
          <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
            >
              {`SCORE: ${score}`}
            </Text>
          </Float>
        </Center>
      </group>

      {/* Next level button */}
      <group position={[0, 1, 0]} onClick={handleClick}>
        <Center>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.7}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
            >
              TAP FOR NEXT LEVEL
            </Text>
          </Float>
        </Center>
      </group>

      {/* Trophy */}
      <group position={[0, -0.5, 0]}>
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.3, 0.5, 16]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} minPolarAngle={Math.PI / 6} />
    </>
  )
}

// Game over scene
function GameOverScene({
  score,
  onRestart,
  onBackToMenu,
}: { score: number; onRestart: () => void; onBackToMenu: () => void }) {
  const { camera } = useThree()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Handle click to restart game
  const handleClick = () => {
    onRestart()
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Game over text */}
      <group position={[0, 4, 0]}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.8}
              color="#FF0000"
              anchorX="center"
              anchorY="middle"
            >
              GAME OVER
            </Text>
          </Float>
        </Center>
      </group>

      {/* Score */}
      <group position={[0, 2.5, 0]}>
        <Center>
          <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
            >
              FINAL SCORE: {score}
            </Text>
          </Float>
        </Center>
      </group>

      {/* Restart button */}
      <group position={[0, 1, 0]} onClick={handleClick}>
        <Center>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.7}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
            >
              TAP TO RESTART
            </Text>
          </Float>
        </Center>
      </group>

      {/* Back to menu button */}
      <group position={[0, 0, 0]} onClick={onBackToMenu}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.4}
              color="#FFD700"
              anchorX="center"
              anchorY="middle"
            >
              BACK TO MENU
            </Text>
          </Float>
        </Center>
      </group>

      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} minPolarAngle={Math.PI / 6} />
    </>
  )
}

// Game complete scene
function GameCompleteScene({
  score,
  onRestart,
  onBackToMenu,
}: { score: number; onRestart: () => void; onBackToMenu: () => void }) {
  const { camera } = useThree()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Handle click to restart game
  const handleClick = () => {
    onRestart()
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Game complete text */}
      <group position={[0, 4, 0]}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.8}
              color="#FFD700"
              anchorX="center"
              anchorY="middle"
            >
              CONGRATULATIONS!
            </Text>
          </Float>
        </Center>
      </group>

      {/* Score */}
      <group position={[0, 2.5, 0]}>
        <Center>
          <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
            >
              FINAL SCORE: {score}
            </Text>
          </Float>
        </Center>
      </group>

      {/* Restart button */}
      <group position={[0, 1, 0]} onClick={handleClick}>
        <Center>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.7}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
            >
              TAP TO PLAY AGAIN
            </Text>
          </Float>
        </Center>
      </group>

      {/* Back to menu button */}
      <group position={[0, 0, 0]} onClick={onBackToMenu}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.4}
              color="#FFD700"
              anchorX="center"
              anchorY="middle"
            >
              BACK TO MENU
            </Text>
          </Float>
        </Center>
      </group>

      {/* Trophy */}
      <group position={[0, -0.5, 0]}>
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.3, 0.5, 16]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} minPolarAngle={Math.PI / 6} />
    </>
  )
}

// Main component
export default function BlockBreaker3D() {
  const [gameState, setGameState] = useState<"start" | "playing" | "levelComplete" | "gameOver" | "gameComplete">(
    "start",
  )
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [blocks, setBlocks] = useState<any[]>([])
  const [blocksDestroyed, setBlocksDestroyed] = useState(0)
  const [totalBlocksDestroyed, setTotalBlocksDestroyed] = useState(0)
  const [clickIntensity, setClickIntensity] = useState(1)
  const lastClickTimeRef = useRef(0)
  const [hitPositions, setHitPositions] = useState<[number, number, number][]>([])

  // Level configurations
  const getLevelConfig = (level: number): LevelConfig => {
    // Increase complexity with level
    const baseBlocks = 6
    const additionalBlocks = Math.min(level * 2, 20)
    const totalBlocks = baseBlocks + additionalBlocks

    // Determine grid size based on level
    let rows = 2
    let columns = 3
    let layers = 1

    if (level > 3) {
      rows = 3
      columns = 4
      layers = 2
    }
    if (level > 6) {
      rows = 4
      columns = 5
      layers = 3
    }

    return {
      blockCount: totalBlocks,
      blockHealth: Math.ceil(level * 1.2),
      timeLimit: 10, // 10 seconds per level
      rows,
      columns,
      layers,
    }
  }

  // Initialize level
  const initializeLevel = () => {
    if (level > 10) {
      // Game completed
      setGameState("gameComplete")
      return
    }

    const config = getLevelConfig(level)
    const newBlocks: any[] = []

    // Create blocks in a 3D grid pattern
    let blockId = 0
    for (let layer = 0; layer < config.layers; layer++) {
      for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.columns; col++) {
          // Skip some blocks randomly to create interesting shapes
          // But ensure at least 70% of the grid is filled
          if (Math.random() > 0.3 || (row === 0 && col === 0 && layer === 0)) {
            // Calculate position with slight randomness
            const x = (col - config.columns / 2) * 1.5 + (Math.random() * 0.4 - 0.2)
            const y = layer * 1.2 + 0.5
            const z = (row - config.rows / 2) * 1.5 + (Math.random() * 0.4 - 0.2)

            // Randomize block size slightly
            const sizeX = 0.8 + Math.random() * 0.2
            const sizeY = 0.8 + Math.random() * 0.2
            const sizeZ = 0.8 + Math.random() * 0.2

            newBlocks.push({
              id: blockId++,
              position: [x, y, z] as [number, number, number],
              size: [sizeX, sizeY, sizeZ] as [number, number, number],
              color: woodColors[Math.floor(Math.random() * woodColors.length)],
              health: config.blockHealth,
              maxHealth: config.blockHealth,
            })
          }
        }
      }
    }

    // Ensure we have at least the minimum number of blocks
    while (newBlocks.length < config.blockCount) {
      const x = Math.random() * 6 - 3
      const y = Math.random() * 3 + 0.5
      const z = Math.random() * 6 - 3

      newBlocks.push({
        id: blockId++,
        position: [x, y, z] as [number, number, number],
        size: [0.8 + Math.random() * 0.2, 0.8 + Math.random() * 0.2, 0.8 + Math.random() * 0.2] as [
          number,
          number,
          number,
        ],
        color: woodColors[Math.floor(Math.random() * woodColors.length)],
        health: config.blockHealth,
        maxHealth: config.blockHealth,
      })
    }

    setBlocks(newBlocks)
    setBlocksDestroyed(0)
    setTimeLeft(config.timeLimit)
    setGameState("playing")
  }

  // Start game
  const startGame = () => {
    setLevel(1)
    setScore(0)
    setTotalBlocksDestroyed(0)
    initializeLevel()
  }

  // Start next level
  const startNextLevel = () => {
    setLevel(level + 1)
    initializeLevel()
  }

  // Handle block destroy
  const handleBlockDestroy = (id: number) => {
    // Find the block that was destroyed
    const destroyedBlock = blocks.find((block) => block.id === id)
    if (!destroyedBlock) return

    // Find all blocks that should be affected (including the destroyed one)
    const [x, y, z] = destroyedBlock.position

    // Create a map of blocks to process with their damage amounts
    const blocksToProcess = new Map()

    // Add the destroyed block
    blocksToProcess.set(id, destroyedBlock.health)

    // Find nearby blocks for area effect
    blocks.forEach((block) => {
      if (block.id !== id) {
        const [bx, by, bz] = block.position
        const distance = Math.sqrt(Math.pow(x - bx, 2) + Math.pow(y - by, 2) + Math.pow(z - bz, 2))

        // If block is close enough, add it to the processing list
        if (distance < 2) {
          // Closer blocks take more damage
          const damage = distance < 1 ? 2 : 1
          blocksToProcess.set(block.id, damage)
        }
      }
    })

    // Process all blocks at once to avoid recursion
    let destroyedCount = 0
    let updatedBlocks = [...blocks]

    // First pass: apply damage to all blocks
    blocksToProcess.forEach((damage, blockId) => {
      updatedBlocks = updatedBlocks.map((block) => {
        if (block.id === blockId) {
          const newHealth = Math.max(0, block.health - damage)
          return { ...block, health: newHealth }
        }
        return block
      })
    })

    // Second pass: count destroyed blocks and remove them
    updatedBlocks = updatedBlocks.filter((block) => {
      if (block.health <= 0) {
        destroyedCount++
        return false
      }
      return true
    })

    // Update state
    setBlocks(updatedBlocks)
    setBlocksDestroyed((prev) => prev + destroyedCount)
    setTotalBlocksDestroyed((prev) => prev + destroyedCount)
    setScore((prev) => prev + level * 10 * destroyedCount)

    // Check if level is complete
    if (updatedBlocks.length === 0) {
      setGameState("levelComplete")
      setTimeLeft(0)
    }
  }

  // Handle block damage
  const handleBlockDamage = (id: number) => {
    setBlocks(
      blocks.map((block) => {
        if (block.id === id) {
          return {
            ...block,
            health: block.health - 1,
          }
        }
        return block
      }),
    )
  }

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameState === "playing" && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)

        if (timeLeft === 1) {
          // Time's up
          setGameState("gameOver")
        }
      }, 1000)
    } else {
      if (timer) clearTimeout(timer)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameState, timeLeft])

  // Handle block hit for effects
  const handleBlockHit = (position: [number, number, number]) => {
    // Calculate click speed based on time between clicks
    const now = Date.now()
    const timeDiff = now - lastClickTimeRef.current
    lastClickTimeRef.current = now

    // Update click intensity (faster clicks = higher intensity)
    const newIntensity = timeDiff < 300 ? Math.min(clickIntensity + 0.5, 5) : Math.max(1, clickIntensity - 0.2)
    setClickIntensity(newIntensity)

    // Add hit position for effects
    setHitPositions((prev) => [...prev, position])

    // Remove hit position after animation
    setTimeout(() => {
      setHitPositions((prev) => prev.slice(1))
    }, 500)
  }

  const backToMenu = () => {
    setGameState("start")
  }

  return (
    <div className="w-full h-screen">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />

        {gameState === "start" && <StartScene onStartGame={startGame} />}

        {gameState === "playing" && (
          <GameScene
            level={level}
            score={score}
            timeLeft={timeLeft}
            blocks={blocks}
            onBlockDestroy={handleBlockDestroy}
            onBlockDamage={handleBlockDamage}
            clickIntensity={clickIntensity}
            onBlockHit={handleBlockHit}
          />
        )}

        {gameState === "levelComplete" && (
          <LevelCompleteScene level={level} score={score} onNextLevel={startNextLevel} />
        )}

        {gameState === "gameOver" && (
          <GameOverScene score={score} onRestart={startGame} onBackToMenu={() => setGameState("start")} />
        )}

        {gameState === "gameComplete" && (
          <GameCompleteScene score={score} onRestart={startGame} onBackToMenu={() => setGameState("start")} />
        )}

        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

// Particle effect component
function ParticleEffect({ position, intensity = 1 }: { position: [number, number, number]; intensity: number }) {
  const [particles, setParticles] = useState<
    Array<{ position: [number, number, number]; velocity: [number, number, number]; life: number }>
  >([])
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    // Create particles
    const newParticles = []
    const particleCount = Math.floor(10 * intensity)

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.05 + Math.random() * 0.1 * intensity
      newParticles.push({
        position: [...position] as [number, number, number],
        velocity: [Math.cos(angle) * speed, (Math.random() * 0.1 + 0.05) * intensity, Math.sin(angle) * speed] as [
          number,
          number,
          number,
        ],
        life: 1.0,
      })
    }

    setParticles(newParticles)
  }, [position, intensity])

  useFrame(() => {
    setParticles((currentParticles) =>
      currentParticles
        .map((particle) => ({
          ...particle,
          position: [
            particle.position[0] + particle.velocity[0],
            particle.position[1] + particle.velocity[1],
            particle.position[2] + particle.velocity[2],
          ] as [number, number, number],
          velocity: [
            particle.velocity[0],
            particle.velocity[1] - 0.003, // gravity
            particle.velocity[2],
          ] as [number, number, number],
          life: particle.life - 0.02,
        }))
        .filter((particle) => particle.life > 0),
    )
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry args={[0.1 * intensity * particle.life, 8, 8]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={2 * intensity * particle.life}
            transparent={true}
            opacity={particle.life}
          />
        </mesh>
      ))}
    </group>
  )
}

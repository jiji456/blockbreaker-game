"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Physics, useBox, usePlane } from "@react-three/cannon"
import { OrbitControls, PerspectiveCamera, Text, Center, Float, Stars, Sky, Cloud } from "@react-three/drei"
import { Bloom, EffectComposer } from "@react-three/postprocessing"
import type * as THREE from "three"
import { useMobile } from "@/hooks/use-mobile"

// Block type
type Block3DProps = {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  health: number
  maxHealth: number
  id: number
  blockType: BlockType
  onDestroy: (id: number) => void
  onDamage: (id: number) => void
}

// Block types
type BlockType = "normal" | "explosive" | "heavy" | "bonus" | "shield"

// Power-up type
type PowerUpType = "hammer" | "bomb" | "freeze" | "multiplier"

// Level configuration
type LevelConfig = {
  blockCount: number
  blockHealth: number
  timeLimit: number
  rows: number
  columns: number
  layers: number
  specialBlocks: {
    explosive: number
    heavy: number
    bonus: number
    shield: number
  }
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
  blockType,
  onDestroy,
  onDamage,
  onHit,
}: Block3DProps & { onHit: (position: [number, number, number], blockType: BlockType) => void }) {
  const [ref, api] = useBox(() => ({
    mass: blockType === "heavy" ? 2 : 1,
    position,
    args: size,
    linearDamping: 0.9,
    angularDamping: 0.9,
  }))

  const [localHealth, setLocalHealth] = useState(health)
  const [isHovered, setIsHovered] = useState(false)
  const [isHit, setIsHit] = useState(false)
  const [emissiveIntensity, setEmissiveIntensity] = useState(0)
  const isMobile = useMobile()

  // อัปเดต localHealth เมื่อ health จากภายนอกเปลี่ยน
  useEffect(() => {
    setLocalHealth(health)
  }, [health])

  // Get color based on block type
  const getBlockColor = () => {
    switch (blockType) {
      case "explosive":
        return "#FF5722" // สีส้มแดง
      case "heavy":
        return "#455A64" // สีเทาเข้ม
      case "bonus":
        return "#FFD700" // สีทอง
      case "shield":
        return "#2196F3" // สีฟ้า
      default:
        return getWoodColor()
    }
  }

  // Get wood color based on health percentage
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

  // Add subtle animation
  useFrame(({ clock }) => {
    if (blockType === "explosive") {
      // บล็อคระเบิดจะมีการกระพริบ
      setEmissiveIntensity(0.2 + Math.sin(clock.getElapsedTime() * 5) * 0.1)
    } else if (blockType === "bonus") {
      // บล็อคโบนัสจะหมุนเล็กน้อย
      if (ref.current) {
        ref.current.rotation.y = clock.getElapsedTime() * 0.5
      }
    }
  })

  // Handle click/tap
  const handleClick = (e: any) => {
    e.stopPropagation()
    setIsHit(true)

    try {
      // Apply force to make it look like it was hit
      api.applyImpulse([0, 3, 0], [0, 0, 0])

      // Trigger hit effect at this position
      onHit(position, blockType)

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
      setTimeout(() => setIsHit(false), 200)
    } catch (error) {
      console.error("Error in block click handler:", error)
      // Fallback behavior to ensure game doesn't get stuck
      onDestroy(id)
    }
  }

  // Get emissive color based on state
  const getEmissiveColor = () => {
    if (blockType === "explosive") return "#FF5722"
    if (blockType === "bonus") return "#FFD700"
    if (isHit) return "#ff9500"
    if (isHovered) return "#ffcc00"
    return "#000000"
  }

  // Get emissive intensity based on state
  const getEmissiveIntensity = () => {
    if (blockType === "explosive") return emissiveIntensity
    if (blockType === "bonus") return 0.2
    if (isHit) return 0.3
    if (isHovered) return 0.1
    return 0
  }

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={() => !isMobile && setIsHovered(true)}
      onPointerOut={() => !isMobile && setIsHovered(false)}
      scale={isHit ? 0.95 : isHovered ? 1.03 : 1}
    >
      {blockType === "bonus" ? <octahedronGeometry args={[size[0] * 0.6, 0]} /> : <boxGeometry args={size} />}

      <meshStandardMaterial
        color={getBlockColor()}
        roughness={blockType === "heavy" ? 0.9 : blockType === "bonus" ? 0.3 : 0.7}
        metalness={blockType === "heavy" ? 0.4 : blockType === "bonus" ? 0.8 : 0.1}
        emissive={getEmissiveColor()}
        emissiveIntensity={getEmissiveIntensity()}
        transparent={blockType === "shield"}
        opacity={blockType === "shield" ? 0.8 : 1}
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

// Power-up component
function PowerUp({
  type,
  position,
  onCollect,
}: { type: PowerUpType; position: [number, number, number]; onCollect: (type: PowerUpType) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)
  const isMobile = useMobile()

  // Animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime()
      meshRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.1
    }
  })

  // Get color based on power-up type
  const getColor = () => {
    switch (type) {
      case "hammer":
        return "#FF9800" // สีส้ม
      case "bomb":
        return "#F44336" // สีแดง
      case "freeze":
        return "#2196F3" // สีฟ้า
      case "multiplier":
        return "#4CAF50" // สีเขียว
      default:
        return "#FFFFFF"
    }
  }

  // Get icon based on power-up type
  const getIcon = () => {
    switch (type) {
      case "hammer":
        return "H"
      case "bomb":
        return "B"
      case "freeze":
        return "F"
      case "multiplier":
        return "x2"
      default:
        return "?"
    }
  }

  // Handle click/tap
  const handleClick = () => {
    try {
      onCollect(type)
    } catch (error) {
      console.error("Error collecting power-up:", error)
    }
  }

  return (
    <group position={position} onClick={handleClick}>
      <mesh
        ref={meshRef}
        castShadow
        onPointerOver={() => !isMobile && setIsHovered(true)}
        onPointerOut={() => !isMobile && setIsHovered(false)}
        scale={isHovered ? 1.1 : 1}
      >
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <Text position={[0, 0, 0.5]} rotation={[0, 0, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
        {getIcon()}
      </Text>
    </group>
  )
}

// Hit effect component
function HitEffect({
  position,
  intensity = 1,
  isLowPerformance = false,
  blockType = "normal",
}: {
  position: [number, number, number]
  intensity?: number
  isLowPerformance?: boolean
  blockType?: BlockType
}) {
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

  // Get effect color based on block type
  const getEffectColor = () => {
    switch (blockType) {
      case "explosive":
        return "#FF5722"
      case "heavy":
        return "#455A64"
      case "bonus":
        return "#FFD700"
      case "shield":
        return "#2196F3"
      default:
        return "#FFD700"
    }
  }

  // ลดจำนวน particles บนอุปกรณ์ประสิทธิภาพต่ำ
  if (isLowPerformance) {
    return (
      <group ref={groupRef} position={position}>
        <mesh>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial
            color={getEffectColor()}
            emissive={getEffectColor()}
            emissiveIntensity={intensity}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial
          color={getEffectColor()}
          emissive={getEffectColor()}
          emissiveIntensity={2 * intensity}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}

// Explosion effect component
function ExplosionEffect({
  position,
  intensity = 1,
  isLowPerformance = false,
}: { position: [number, number, number]; intensity?: number; isLowPerformance?: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const [visible, setVisible] = useState(true)
  const [particles, setParticles] = useState<
    Array<{ position: [number, number, number]; velocity: [number, number, number]; life: number }>
  >([])

  useEffect(() => {
    // Create explosion particles
    const newParticles = []
    const particleCount = isLowPerformance ? 5 : 10

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const elevation = Math.random() * Math.PI - Math.PI / 2
      const speed = 0.1 + Math.random() * 0.2 * intensity

      newParticles.push({
        position: [...position] as [number, number, number],
        velocity: [
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed,
          Math.sin(angle) * Math.cos(elevation) * speed,
        ] as [number, number, number],
        life: 1.0,
      })
    }

    setParticles(newParticles)

    const timer = setTimeout(() => {
      setVisible(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [position, intensity, isLowPerformance])

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

  if (!visible && particles.length === 0) return null

  return (
    <group ref={groupRef}>
      {/* Central explosion */}
      {visible && (
        <mesh position={position}>
          <sphereGeometry args={[0.8 * intensity, 16, 16]} />
          <meshStandardMaterial
            color="#FF5722"
            emissive="#FF9800"
            emissiveIntensity={2}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Particles */}
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry args={[0.2 * intensity * particle.life, 8, 8]} />
          <meshBasicMaterial color="#FF9800" transparent={true} opacity={particle.life} />
        </mesh>
      ))}
    </group>
  )
}

// เพิ่มฟังก์ชัน FloatingWoodChip สำหรับเศษไม้ลอยในฉาก
function FloatingWoodChip({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const velocity = useRef<[number, number, number]>([
    (Math.random() - 0.5) * 0.05,
    Math.random() * 0.05,
    (Math.random() - 0.5) * 0.05,
  ])
  const rotation = useRef<[number, number, number]>([
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  ])
  const rotationSpeed = useRef<[number, number, number]>([
    (Math.random() - 0.5) * 0.05,
    (Math.random() - 0.5) * 0.05,
    (Math.random() - 0.5) * 0.05,
  ])

  useFrame(() => {
    if (meshRef.current) {
      // อัปเดตตำแหน่ง
      meshRef.current.position.x += velocity.current[0]
      meshRef.current.position.y += velocity.current[1]
      meshRef.current.position.z += velocity.current[2]

      // อัปเดตการหมุน
      meshRef.current.rotation.x += rotationSpeed.current[0]
      meshRef.current.rotation.y += rotationSpeed.current[1]
      meshRef.current.rotation.z += rotationSpeed.current[2]

      // แรงโน้มถ่วง
      velocity.current[1] -= 0.001

      // ลดความเร็วเนื่องจากแรงต้าน
      velocity.current[0] *= 0.99
      velocity.current[1] *= 0.99
      velocity.current[2] *= 0.99
    }
  })

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={[0.3 * scale, 0.1 * scale, 0.5 * scale]} />
      <meshStandardMaterial color="#8B4513" roughness={0.8} />
    </mesh>
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
        <cylinderGeometry args={[0.2, 0.3, 1.5, 6]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>

      {/* Leaves */}
      <mesh ref={leavesRef} castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
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
          <sphereGeometry args={[0.5, 8, 8]} />
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

// Combo indicator
function ComboIndicator({ combo, position = [0, 2, -3] }: { combo: number; position?: [number, number, number] }) {
  const [visible, setVisible] = useState(false)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    if (combo > 1) {
      setVisible(true)
      setScale(1.5)

      const timer = setTimeout(() => {
        setScale(1)
      }, 200)

      const hideTimer = setTimeout(() => {
        setVisible(false)
      }, 2000)

      return () => {
        clearTimeout(timer)
        clearTimeout(hideTimer)
      }
    }
  }, [combo])

  if (!visible) return null

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
        <Text
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.6 * scale}
          color="#FF9800"
          anchorX="center"
          anchorY="middle"
        >
          {`COMBO x${combo}`}
        </Text>
      </Float>
    </group>
  )
}

// Active power-up indicator
function PowerUpIndicator({
  activePowerUp,
  timeLeft,
  position = [-4, 1.5, -5],
}: { activePowerUp: PowerUpType | null; timeLeft: number; position?: [number, number, number] }) {
  if (!activePowerUp) return null

  // Get power-up name
  const getPowerUpName = () => {
    switch (activePowerUp) {
      case "hammer":
        return "SUPER HAMMER"
      case "bomb":
        return "BOMB"
      case "freeze":
        return "TIME FREEZE"
      case "multiplier":
        return "SCORE x2"
      default:
        return "POWER-UP"
    }
  }

  // Get power-up color
  const getPowerUpColor = () => {
    switch (activePowerUp) {
      case "hammer":
        return "#FF9800"
      case "bomb":
        return "#F44336"
      case "freeze":
        return "#2196F3"
      case "multiplier":
        return "#4CAF50"
      default:
        return "#FFFFFF"
    }
  }

  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
        <Text
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.3}
          color={getPowerUpColor()}
          anchorX="center"
          anchorY="middle"
        >
          {`${getPowerUpName()}: ${timeLeft}s`}
        </Text>
      </Float>
    </group>
  )
}

// เพิ่มฟังก์ชัน Axe สำหรับแสดงขวานในฉาก
function Axe({
  position = [3, 0, 3],
  rotation = [0, 0, 0],
}: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const axeRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (axeRef.current) {
      axeRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.2
      axeRef.current.position.y = 0.5 + Math.sin(clock.getElapsedTime()) * 0.1
    }
  })

  return (
    <group ref={axeRef} position={position} rotation={rotation} scale={[0.5, 0.5, 0.5]}>
      {/* ด้ามขวาน */}
      <mesh castShadow receiveShadow position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.1, 0.1, 2, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>

      {/* หัวขวาน */}
      <mesh castShadow receiveShadow position={[0.5, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#A9A9A9" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh castShadow receiveShadow position={[0.7, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.4, 0.05, 0.5]} />
        <meshStandardMaterial color="#808080" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// เพิ่มฟังก์ชัน WoodStump สำหรับตอไม้
function WoodStump({ position = [-3, -0.4, 3] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.4, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>

      {/* วงปีไม้ */}
      <mesh receiveShadow position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#A0522D" roughness={0.8} />
      </mesh>

      {/* วงปีไม้ไม้ชั้นใน */}
      {[0.6, 0.4, 0.2].map((radius, i) => (
        <mesh key={i} receiveShadow position={[0, 0.211, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.05, radius, 32]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#8B4513" : "#A0522D"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// Game scene
function GameScene({
  level,
  score,
  timeLeft,
  blocks,
  powerUps,
  combo,
  activePowerUp,
  powerUpTimeLeft,
  onBlockDestroy,
  onBlockDamage,
  clickIntensity,
  onBlockHit,
  onPowerUpCollect,
  isLowPerformance,
}: {
  level: number
  score: number
  timeLeft: number
  blocks: any[]
  powerUps: { type: PowerUpType; position: [number, number, number] }[]
  combo: number
  activePowerUp: PowerUpType | null
  powerUpTimeLeft: number
  onBlockDestroy: (id: number) => void
  onBlockDamage: (id: number) => void
  clickIntensity: number
  onBlockHit: (position: [number, number, number], blockType: BlockType) => void
  onPowerUpCollect: (type: PowerUpType) => void
  isLowPerformance: boolean
}) {
  const { camera } = useThree()
  const [hitEffects, setHitEffects] = useState<
    { id: number; position: [number, number, number]; blockType: BlockType }[]
  >([])
  const [explosions, setExplosions] = useState<{ id: number; position: [number, number, number]; intensity: number }[]>(
    [],
  )
  const effectIdCounter = useRef(0)
  const explosionIdCounter = useRef(0)
  const cameraShakeRef = useRef({ x: 0, y: 0, intensity: 0 })
  const [woodChips, setWoodChips] = useState<{ id: number; position: [number, number, number]; scale: number }[]>([])
  const woodChipCounter = useRef(0)
  const isMobile = useMobile()

  // เลือกสภาพแวดล้อมตามระดับ
  const getEnvironment = () => {
    const environments = ["day", "sunset", "night", "storm"]
    return environments[(level - 1) % environments.length]
  }

  const environment = getEnvironment()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 10, 10)
    camera.lookAt(0, 0, 0)
  }, [camera])

  // Handle camera shake and movement
  useFrame(({ clock }) => {
    if (cameraShakeRef.current.intensity > 0) {
      // Apply camera shake
      const time = clock.getElapsedTime() * 20
      const shakeX = Math.sin(time) * cameraShakeRef.current.intensity * 0.2
      const shakeY = Math.cos(time) * cameraShakeRef.current.intensity * 0.1

      camera.position.x += (cameraShakeRef.current.x + shakeX - camera.position.x) * 0.1
      camera.position.y += (10 + shakeY - camera.position.y) * 0.1
      camera.position.z += (10 - camera.position.z) * 0.1

      // ลดความเข้มของการสั่นเร็วขึ้น
      cameraShakeRef.current.intensity *= 0.85
      if (cameraShakeRef.current.intensity < 0.01) {
        cameraShakeRef.current.intensity = 0
      }
    } else {
      // Smooth return to original position
      camera.position.x += (0 - camera.position.x) * 0.03
      camera.position.y += (10 - camera.position.y) * 0.03
      camera.position.z += (10 - camera.position.z) * 0.03
    }

    // Always look at center
    camera.lookAt(0, 0, 0)
  })

  // Handle block hit
  const handleBlockHit = useCallback(
    (position: [number, number, number], blockType: BlockType) => {
      try {
        // Add hit effect
        if (Math.random() > 0.5) {
          const newEffectId = effectIdCounter.current++
          setHitEffects((prev) => [...prev, { id: newEffectId, position, blockType }])

          // Remove effect after animation
          setTimeout(() => {
            setHitEffects((prev) => prev.filter((effect) => effect.id !== newEffectId))
          }, 200)
        }

        // Add explosion effect for explosive blocks
        if (blockType === "explosive") {
          const newExplosionId = explosionIdCounter.current++
          setExplosions((prev) => [...prev, { id: newExplosionId, position, intensity: 1.5 }])

          // Apply stronger camera shake for explosions
          cameraShakeRef.current = {
            x: position[0] * 0.1,
            y: position[1] * 0.05,
            intensity: 0.5,
          }

          // Remove explosion after animation
          setTimeout(() => {
            setExplosions((prev) => prev.filter((explosion) => explosion.id !== newExplosionId))
          }, 1000)
        }

        // Add wood chips
        if (!isLowPerformance && Math.random() > 0.7) {
          const newChips = []
          newChips.push({
            id: woodChipCounter.current++,
            position: position as [number, number, number],
            scale: 0.5 + Math.random() * 0.5,
          })
          setWoodChips((prev) => [...prev, ...newChips])
        }

        // ลบ wood chips เก่าทิ้ง
        if (woodChips.length > 3) {
          setWoodChips((prev) => prev.slice(prev.length - 3))
        }

        // Apply camera shake
        cameraShakeRef.current = {
          x: position[0] * 0.05,
          y: position[1] * 0.02,
          intensity: 0.2 * clickIntensity,
        }

        // Pass to parent component
        onBlockHit(position, blockType)
      } catch (error) {
        console.error("Error in handleBlockHit:", error)
      }
    },
    [clickIntensity, isLowPerformance, onBlockHit, woodChips.length],
  )

  return (
    <>
      <ambientLight intensity={environment === "night" ? 0.3 : 0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={environment === "night" ? 0.7 : 1}
        castShadow
        shadow-mapSize-width={isLowPerformance ? 1024 : 2048}
        shadow-mapSize-height={isLowPerformance ? 1024 : 2048}
      />

      {/* สภาพแวดล้อมตามระดับ */}
      {environment === "day" && <Sky sunPosition={[0, 1, 0]} />}
      {environment === "sunset" && <Sky sunPosition={[0, 0.2, -1]} />}
      {environment === "night" && (
        <Stars
          radius={100}
          depth={50}
          count={isLowPerformance ? 1000 : 2000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      )}
      {environment === "storm" && !isLowPerformance && (
        <>
          <Sky sunPosition={[0, 0.1, -1]} turbidity={10} rayleigh={1} />
          <Cloud position={[0, 15, -10]} speed={0.4} opacity={0.7} width={20} depth={1.5} />
          <Cloud position={[-10, 10, -15]} speed={0.2} opacity={0.6} width={15} depth={1} />
          <Cloud position={[10, 12, -5]} speed={0.3} opacity={0.8} width={18} depth={2} />

          {/* ฟ้าแลบ */}
          {Math.random() > 0.97 && (
            <pointLight
              position={[(Math.random() - 0.5) * 20, 10 + Math.random() * 10, (Math.random() - 0.5) * 20]}
              intensity={50}
              distance={100}
              decay={2}
              color="#FFFFFF"
            />
          )}
        </>
      )}
      {environment === "storm" && isLowPerformance && <Sky sunPosition={[0, 0.1, -1]} turbidity={10} rayleigh={1} />}

      {/* Hit effects */}
      {hitEffects.map((effect) => (
        <HitEffect
          key={effect.id}
          position={effect.position}
          intensity={clickIntensity}
          isLowPerformance={isLowPerformance}
          blockType={effect.blockType}
        />
      ))}

      {/* Explosion effects */}
      {explosions.map((explosion) => (
        <ExplosionEffect
          key={explosion.id}
          position={explosion.position}
          intensity={explosion.intensity}
          isLowPerformance={isLowPerformance}
        />
      ))}

      {/* Wood chips */}
      {woodChips.map((chip) => (
        <FloatingWoodChip key={chip.id} position={chip.position} scale={chip.scale} />
      ))}

      <Physics
        iterations={isLowPerformance ? 1 : 3}
        tolerance={0.005}
        defaultContactMaterial={{
          friction: 0.1,
          restitution: 0.2,
        }}
        gravity={[0, -2, 0]}
      >
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
            blockType={block.blockType}
            onDestroy={onBlockDestroy}
            onDamage={onBlockDamage}
            onHit={handleBlockHit}
          />
        ))}
      </Physics>

      {/* Power-ups */}
      {powerUps.map((powerUp, index) => (
        <PowerUp key={index} type={powerUp.type} position={powerUp.position} onCollect={onPowerUpCollect} />
      ))}

      {/* Game UI elements */}
      <LevelIndicator level={level} />
      <ScoreIndicator score={score} />
      <TimerIndicator time={timeLeft} />
      <ComboIndicator combo={combo} />
      <PowerUpIndicator activePowerUp={activePowerUp} timeLeft={powerUpTimeLeft} />

      {/* องค์ประกอบตกแต่งเพิ่มเติม */}
      {!isLowPerformance && (
        <>
          <Axe position={[5, 0, 5]} rotation={[0, Math.PI / 4, 0]} />
          <Axe position={[-5, 0, 5]} rotation={[0, -Math.PI / 4, 0]} />
          <WoodStump position={[-4, -0.4, 4]} />
          <WoodStump position={[4, -0.4, 4]} />
        </>
      )}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enableDamping={false}
        enableRotate={!isMobile}
      />
    </>
  )
}

// Start screen scene
function StartScene({ onStartGame }: { onStartGame: () => void }) {
  const { camera } = useThree()
  const cameraRef = useRef({ x: 0, y: 5, z: 10 })
  const isMobile = useMobile()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Animate camera
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()

    // Gentle camera movement
    if (!isMobile) {
      camera.position.x = Math.sin(time * 0.2) * 2
      camera.position.y = 5 + Math.sin(time * 0.1) * 0.5
      camera.position.z = 10 + Math.cos(time * 0.15) * 1
    }

    camera.lookAt(0, 2, 0)
  })

  // Handle click to start game
  const handleClick = () => {
    try {
      onStartGame()
    } catch (error) {
      console.error("Error starting game:", error)
      // Fallback - reload the page if game fails to start
      window.location.reload()
    }
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Stars radius={100} depth={50} count={isMobile ? 1000 : 2000} factor={4} saturation={0} fade speed={1} />

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

      {/* Subtitle */}
      <group position={[0, 3, 0]}>
        <Center>
          <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.4}
              color="#FF9800"
              anchorX="center"
              anchorY="middle"
            >
              SPECIAL EDITION
            </Text>
          </Float>
        </Center>
      </group>

      {/* Start button */}
      <group position={[0, 2, 0]} onClick={handleClick}>
        <Center>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.7}>
            <mesh position={[0, 0, -0.05]} receiveShadow>
              <boxGeometry args={[3.5, 0.8, 0.1]} />
              <meshStandardMaterial color="#000000" opacity={0.8} transparent={true} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              outlineColor="#000000"
              outlineWidth={0.02}
            >
              TAP TO START
            </Text>
          </Float>
        </Center>
      </group>

      {/* Features text */}
      <group position={[0, 0.5, 0]}>
        <Center>
          <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.25}
              color="#BBBBBB"
              anchorX="center"
              anchorY="middle"
            >
              SPECIAL BLOCKS • POWER-UPS • COMBOS
            </Text>
          </Float>
        </Center>
      </group>

      {/* Decorative trees */}
      {!isMobile ? (
        <>
          <Tree3D position={[-5, -0.5, -2]} scale={1.2} />
          <Tree3D position={[5, -0.5, -3]} scale={1.5} />
          <Tree3D position={[-3, -0.5, -5]} scale={1} />
          <Tree3D position={[4, -0.5, -4]} scale={1.3} />
          <Tree3D position={[0, -0.5, -6]} scale={1.4} />
        </>
      ) : (
        <>
          <Tree3D position={[-4, -0.5, -3]} scale={1.2} />
          <Tree3D position={[4, -0.5, -3]} scale={1.5} />
          <Tree3D position={[0, -0.5, -5]} scale={1.3} />
        </>
      )}

      {/* Floor */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enableDamping={false}
        enableRotate={!isMobile}
      />
    </>
  )
}

// Level complete scene
function LevelCompleteScene({
  level,
  score,
  onNextLevel,
  isLowPerformance,
}: { level: number; score: number; onNextLevel: () => void; isLowPerformance: boolean }) {
  const { camera } = useThree()
  const isMobile = useMobile()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Handle click to go to next level
  const handleClick = () => {
    try {
      onNextLevel()
    } catch (error) {
      console.error("Error going to next level:", error)
      // Fallback - reload the page if level transition fails
      window.location.reload()
    }
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={isLowPerformance ? 1024 : 2048}
        shadow-mapSize-height={isLowPerformance ? 1024 : 2048}
      />

      <Stars radius={100} depth={50} count={isLowPerformance ? 1000 : 2000} factor={4} saturation={0} fade speed={1} />

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
      <group position={[0, 1.5, 0]} onClick={handleClick}>
        <Center>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.7}>
            <mesh position={[0, 0, -0.05]} receiveShadow>
              <boxGeometry args={[5, 1, 0.1]} />
              <meshStandardMaterial color="#000000" opacity={0.8} transparent={true} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              outlineColor="#000000"
              outlineWidth={0.02}
            >
              TAP FOR NEXT LEVEL
            </Text>
          </Float>
        </Center>
      </group>

      {/* Trophy */}
      <group position={[0, -1, 0]}>
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.3, 0.5, 16]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enableDamping={false}
        enableRotate={!isMobile}
      />
    </>
  )
}

// Game over scene
function GameOverScene({
  score,
  onRestart,
  onBackToMenu,
  isLowPerformance,
}: { score: number; onRestart: () => void; onBackToMenu: () => void; isLowPerformance: boolean }) {
  const { camera } = useThree()
  const isMobile = useMobile()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Handle click to restart game
  const handleClick = () => {
    try {
      onRestart()
    } catch (error) {
      console.error("Error restarting game:", error)
      // Fallback - reload the page if restart fails
      window.location.reload()
    }
  }

  const handleBackToMenu = () => {
    try {
      onBackToMenu()
    } catch (error) {
      console.error("Error going back to menu:", error)
      // Fallback - reload the page if menu transition fails
      window.location.reload()
    }
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={isLowPerformance ? 1024 : 2048}
        shadow-mapSize-height={isLowPerformance ? 1024 : 2048}
      />

      <Stars radius={100} depth={50} count={isLowPerformance ? 1000 : 2000} factor={4} saturation={0} fade speed={1} />

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
            <mesh position={[0, 0, -0.05]} receiveShadow>
              <boxGeometry args={[4, 0.8, 0.1]} />
              <meshStandardMaterial color="#000000" opacity={0.8} transparent={true} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              outlineColor="#000000"
              outlineWidth={0.02}
            >
              TAP TO RESTART
            </Text>
          </Float>
        </Center>
      </group>

      {/* Back to menu button */}
      <group position={[0, 0, 0]} onClick={handleBackToMenu}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh position={[0, 0, -0.05]} receiveShadow>
              <boxGeometry args={[3.5, 0.7, 0.1]} />
              <meshStandardMaterial color="#000000" opacity={0.7} transparent={true} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.4}
              color="#FFD700"
              anchorX="center"
              anchorY="middle"
              outlineColor="#000000"
              outlineWidth={0.02}
            >
              BACK TO MENU
            </Text>
          </Float>
        </Center>
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enableDamping={false}
        enableRotate={!isMobile}
      />
    </>
  )
}

// Game complete scene
function GameCompleteScene({
  score,
  onRestart,
  onBackToMenu,
  isLowPerformance,
}: { score: number; onRestart: () => void; onBackToMenu: () => void; isLowPerformance: boolean }) {
  const { camera } = useThree()
  const isMobile = useMobile()

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 2, 0)
  }, [camera])

  // Handle click to restart game
  const handleClick = () => {
    try {
      onRestart()
    } catch (error) {
      console.error("Error restarting game:", error)
      // Fallback - reload the page if restart fails
      window.location.reload()
    }
  }

  const handleBackToMenu = () => {
    try {
      onBackToMenu()
    } catch (error) {
      console.error("Error going back to menu:", error)
      // Fallback - reload the page if menu transition fails
      window.location.reload()
    }
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={isLowPerformance ? 1024 : 2048}
        shadow-mapSize-height={isLowPerformance ? 1024 : 2048}
      />

      <Stars radius={100} depth={50} count={isLowPerformance ? 1000 : 2000} factor={4} saturation={0} fade speed={1} />

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
            <mesh position={[0, 0, -0.05]} receiveShadow>
              <boxGeometry args={[4.5, 0.8, 0.1]} />
              <meshStandardMaterial color="#000000" opacity={0.8} transparent={true} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              outlineColor="#000000"
              outlineWidth={0.02}
            >
              TAP TO PLAY AGAIN
            </Text>
          </Float>
        </Center>
      </group>

      {/* Back to menu button */}
      <group position={[0, 0, 0]} onClick={handleBackToMenu}>
        <Center>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh position={[0, 0, -0.05]} receiveShadow>
              <boxGeometry args={[3.5, 0.7, 0.1]} />
              <meshStandardMaterial color="#000000" opacity={0.7} transparent={true} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.4}
              color="#FFD700"
              anchorX="center"
              anchorY="middle"
              outlineColor="#000000"
              outlineWidth={0.02}
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
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enableDamping={false}
        enableRotate={!isMobile}
      />
    </>
  )
}

// Particle effect component
function ParticleEffect({
  position,
  intensity = 1,
  isLowPerformance = false,
}: { position: [number, number, number]; intensity: number; isLowPerformance: boolean }) {
  const [particles, setParticles] = useState<
    Array<{ position: [number, number, number]; velocity: [number, number, number]; life: number }>
  >([])
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    // ลดจำนวน particles ลงอย่างมาก
    const newParticles = []
    // ลดจำนวน particles ลงเหลือแค่ 1-2 อัน
    const particleCount = Math.floor((isLowPerformance ? 1 : 2) * intensity)

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
  }, [position, intensity, isLowPerformance])

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
          life: particle.life - 0.04, // ทำให้หายเร็วขึ้น
        }))
        .filter((particle) => particle.life > 0),
    )
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry
            args={[0.1 * intensity * particle.life, 4, 4]} // ลดความละเอียดลงอีก
          />
          <meshBasicMaterial // ใช้ Basic Material แทน Standard Material
            color="#FFD700"
            transparent={true}
            opacity={particle.life}
          />
        </mesh>
      ))}
    </group>
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
  const [powerUps, setPowerUps] = useState<{ type: PowerUpType; position: [number, number, number] }[]>([])
  const [blocksDestroyed, setBlocksDestroyed] = useState(0)
  const [totalBlocksDestroyed, setTotalBlocksDestroyed] = useState(0)
  const [clickIntensity, setClickIntensity] = useState(1)
  const [combo, setCombo] = useState(0)
  const [lastBlockDestroyTime, setLastBlockDestroyTime] = useState(0)
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null)
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0)
  const lastClickTimeRef = useRef(0)
  const [hitPositions, setHitPositions] = useState<[number, number, number][]>([])
  const [isLowPerformance, setIsLowPerformance] = useState(false)
  const isMobile = useMobile()
  const [gameError, setGameError] = useState<string | null>(null)

  useEffect(() => {
    // ตรวจสอบว่าเป็นมือถือหรือไม่
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    // ตรวจสอบประสิทธิภาพของเครื่อง
    const checkPerformance = () => {
      // ตรวจสอบจำนวน logical processors
      const cpuCores = navigator.hardwareConcurrency || 2

      // ตรวจสอบ memory (ถ้าเบราว์เซอร์รองรับ)
      let lowMemory = false
      if ((navigator as any).deviceMemory) {
        lowMemory = (navigator as any).deviceMemory < 4
      }

      // ตัดสินใจจากข้อมูลทั้งหมด
      const isLowPerf = lowMemory || cpuCores <= 4 || isMobile
      setIsLowPerformance(isLowPerf)
    }

    checkPerformance()
  }, [])

  // Error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Game error:", event.error)
      setGameError(event.message)

      // Try to recover from error
      if (gameState === "playing") {
        // If error happens during gameplay, try to go back to start screen
        setGameState("start")
      }
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [gameState])

  // Level configurations
  const getLevelConfig = useCallback(
    (level: number): LevelConfig => {
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

      // ลดความซับซ้อนบนอุปกรณ์ประสิทธิภาพต่ำ
      if (isLowPerformance) {
        rows = Math.max(2, Math.floor(rows * 0.5))
        columns = Math.max(2, Math.floor(columns * 0.5))
        layers = 1
      }

      // Calculate special blocks based on level
      const specialBlocks = {
        explosive: Math.min(Math.floor(level / 2), 5), // เพิ่มบล็อคระเบิดตามระดับ
        heavy: Math.min(Math.floor(level / 3), 3), // เพิ่มบล็อคหนักตามระดับ
        bonus: Math.min(Math.floor(level / 2), 4), // เพิ่มบล็อคโบนัสตามระดับ
        shield: Math.min(Math.floor(level / 4), 2), // เพิ่มบล็อคโล่ตามระดับ
      }

      return {
        blockCount: isLowPerformance ? Math.floor(totalBlocks * 0.5) : totalBlocks,
        blockHealth: Math.ceil(level * 1.0),
        timeLimit: 10, // 10 seconds per level
        rows,
        columns,
        layers,
        specialBlocks,
      }
    },
    [isLowPerformance],
  )

  // Initialize level
  const initializeLevel = useCallback(() => {
    try {
      if (level > 10) {
        // Game completed
        setGameState("gameComplete")
        return
      }

      const config = getLevelConfig(level)
      const newBlocks: any[] = []
      const newPowerUps: { type: PowerUpType; position: [number, number, number] }[] = []

      // Create blocks in a 3D grid pattern
      let blockId = 0
      const specialBlocksCount = {
        explosive: 0,
        heavy: 0,
        bonus: 0,
        shield: 0,
      }

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

              // Determine block type
              let blockType: BlockType = "normal"
              let blockHealth = config.blockHealth

              // Assign special block types
              if (specialBlocksCount.explosive < config.specialBlocks.explosive && Math.random() < 0.2) {
                blockType = "explosive"
                specialBlocksCount.explosive++
              } else if (specialBlocksCount.heavy < config.specialBlocks.heavy && Math.random() < 0.15) {
                blockType = "heavy"
                blockHealth = Math.ceil(blockHealth * 1.5) // Heavy blocks have more health
                specialBlocksCount.heavy++
              } else if (specialBlocksCount.bonus < config.specialBlocks.bonus && Math.random() < 0.2) {
                blockType = "bonus"
                blockHealth = Math.ceil(blockHealth * 0.7) // Bonus blocks have less health
                specialBlocksCount.bonus++
              } else if (specialBlocksCount.shield < config.specialBlocks.shield && Math.random() < 0.1) {
                blockType = "shield"
                blockHealth = Math.ceil(blockHealth * 1.2) // Shield blocks have more health
                specialBlocksCount.shield++
              }

              newBlocks.push({
                id: blockId++,
                position: [x, y, z] as [number, number, number],
                size: [sizeX, sizeY, sizeZ] as [number, number, number],
                color: woodColors[Math.floor(Math.random() * woodColors.length)],
                health: blockHealth,
                maxHealth: blockHealth,
                blockType,
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
          blockType: "normal",
        })
      }

      // Add power-ups
      const powerUpCount = Math.min(Math.floor(level / 2) + 1, 3)
      const powerUpTypes: PowerUpType[] = ["hammer", "bomb", "freeze", "multiplier"]

      for (let i = 0; i < powerUpCount; i++) {
        const x = Math.random() * 8 - 4
        const y = Math.random() * 3 + 2
        const z = Math.random() * 8 - 4

        newPowerUps.push({
          type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
          position: [x, y, z] as [number, number, number],
        })
      }

      setBlocks(newBlocks)
      setPowerUps(newPowerUps)
      setBlocksDestroyed(0)
      setTimeLeft(config.timeLimit)
      setCombo(0)
      setLastBlockDestroyTime(0)
      setActivePowerUp(null)
      setPowerUpTimeLeft(0)
      setGameState("playing")
    } catch (error) {
      console.error("Error initializing level:", error)
      setGameError("Failed to initialize level. Please try again.")
      setGameState("start")
    }
  }, [level, getLevelConfig])

  // Start game
  const startGame = useCallback(() => {
    try {
      setLevel(1)
      setScore(0)
      setTotalBlocksDestroyed(0)
      setGameError(null)
      setTimeout(() => {
        initializeLevel()
      }, 0)
    } catch (error) {
      console.error("Error starting game:", error)
      setGameError("Failed to start game. Please try again.")
    }
  }, [initializeLevel])

  // Start next level
  const startNextLevel = useCallback(() => {
    try {
      setLevel((prev) => prev + 1)
      setTimeout(() => {
        initializeLevel()
      }, 0)
    } catch (error) {
      console.error("Error starting next level:", error)
      setGameError("Failed to start next level. Please try again.")
      setGameState("start")
    }
  }, [initializeLevel])

  // Handle block destroy
  const handleBlockDestroy = useCallback(
    (id: number) => {
      try {
        // Find the block that was destroyed
        setBlocks((currentBlocks) => {
          const destroyedBlock = currentBlocks.find((block) => block.id === id)
          if (!destroyedBlock) return currentBlocks

          // Update combo
          const now = Date.now()
          const timeSinceLastDestroy = now - lastBlockDestroyTime

          if (timeSinceLastDestroy < 1000) {
            setCombo((prev) => prev + 1)
          } else {
            setCombo(1)
          }

          setLastBlockDestroyTime(now)

          // Calculate score based on block type and combo
          let blockScore = level * 10

          if (destroyedBlock.blockType === "bonus") {
            blockScore *= 2 // Bonus blocks give double points
          }

          // Apply combo multiplier
          blockScore *= Math.min(combo + 1, 5) // Cap combo multiplier at 5x

          // Apply power-up multiplier
          if (activePowerUp === "multiplier") {
            blockScore *= 2
          }

          setScore((prev) => prev + blockScore)

          // Find all blocks that should be affected (including the destroyed one)
          const [x, y, z] = destroyedBlock.position

          // Create a map of blocks to process with their damage amounts
          const blocksToProcess = new Map()

          // Add the destroyed block
          blocksToProcess.set(id, destroyedBlock.health)

          // Special effects based on block type
          if (destroyedBlock.blockType === "explosive") {
            // Explosive blocks damage all nearby blocks
            const explosionRadius = 3

            currentBlocks.forEach((block) => {
              if (block.id !== id) {
                const [bx, by, bz] = block.position
                const distance = Math.sqrt(Math.pow(x - bx, 2) + Math.pow(y - by, 2) + Math.pow(z - bz, 2))

                // If block is close enough, add it to the processing list
                if (distance < explosionRadius) {
                  // Closer blocks take more damage
                  const damage = Math.ceil((explosionRadius - distance) * 2)
                  blocksToProcess.set(block.id, damage)
                }
              }
            })
          } else {
            // Normal area effect for other blocks
            const effectRadius = isLowPerformance ? 1.2 : 1.5

            // Find nearby blocks for area effect
            currentBlocks.forEach((block) => {
              if (block.id !== id) {
                const [bx, by, bz] = block.position
                const distance = Math.sqrt(Math.pow(x - bx, 2) + Math.pow(y - by, 2) + Math.pow(z - bz, 2))

                // If block is close enough, add it to the processing list
                if (distance < effectRadius) {
                  // Closer blocks take more damage
                  const damage = distance < 0.8 ? 2 : 1
                  blocksToProcess.set(block.id, damage)
                }
              }
            })
          }

          // Process all blocks at once to avoid recursion
          let destroyedCount = 0
          let updatedBlocks = [...currentBlocks]

          // First pass: apply damage to all blocks
          blocksToProcess.forEach((damage, blockId) => {
            updatedBlocks = updatedBlocks.map((block) => {
              if (block.id === blockId) {
                // Shield blocks take less damage
                const actualDamage = block.blockType === "shield" ? Math.ceil(damage / 2) : damage
                const newHealth = Math.max(0, block.health - actualDamage)
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
          setBlocksDestroyed((prev) => prev + destroyedCount)
          setTotalBlocksDestroyed((prev) => prev + destroyedCount)

          // Check if level is complete
          if (updatedBlocks.length === 0) {
            setGameState("levelComplete")
            setTimeLeft(0)
          }

          return updatedBlocks
        })
      } catch (error) {
        console.error("Error destroying block:", error)
        // Fallback behavior to ensure game doesn't get stuck
        setBlocks((prev) => prev.filter((block) => block.id !== id))
      }
    },
    [level, isLowPerformance, lastBlockDestroyTime, combo, activePowerUp],
  )

  // Handle block damage
  const handleBlockDamage = useCallback((id: number) => {
    try {
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id === id) {
            return {
              ...block,
              health: block.health - 1,
            }
          }
          return block
        }),
      )
    } catch (error) {
      console.error("Error damaging block:", error)
    }
  }, [])

  // Handle power-up collection
  const handlePowerUpCollect = useCallback(
    (type: PowerUpType) => {
      try {
        setActivePowerUp(type)

        // Set power-up duration based on type
        switch (type) {
          case "hammer":
            setPowerUpTimeLeft(10) // Super hammer lasts 10 seconds
            break
          case "bomb":
            // Bomb is instant - destroy all blocks with health <= 2
            setBlocks((prev) =>
              prev.filter((block) => {
                if (block.health <= 2 && block.blockType !== "shield") {
                  setBlocksDestroyed((prevCount) => prevCount + 1)
                  setTotalBlocksDestroyed((prevCount) => prevCount + 1)
                  setScore((prevScore) => prevScore + level * 10)
                  return false
                }
                return true
              }),
            )
            setPowerUpTimeLeft(0)
            setActivePowerUp(null)
            break
          case "freeze":
            setPowerUpTimeLeft(5) // Time freeze lasts 5 seconds
            break
          case "multiplier":
            setPowerUpTimeLeft(10) // Score multiplier lasts 10 seconds
            break
          default:
            setPowerUpTimeLeft(0)
            break
        }

        // Remove the collected power-up
        setPowerUps((prev) => prev.filter((powerUp) => powerUp.type !== type))
      } catch (error) {
        console.error("Error collecting power-up:", error)
      }
    },
    [level],
  )

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameState === "playing" && timeLeft > 0) {
      timer = setTimeout(() => {
        // Don't decrease time if freeze power-up is active
        if (activePowerUp !== "freeze") {
          setTimeLeft((prev) => {
            const newTime = prev - 1
            if (newTime === 0) {
              // Time's up
              setGameState("gameOver")
            }
            return newTime
          })
        }
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameState, timeLeft, activePowerUp])

  // Power-up timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (activePowerUp && powerUpTimeLeft > 0) {
      timer = setTimeout(() => {
        setPowerUpTimeLeft((prev) => {
          const newTime = prev - 1
          if (newTime === 0) {
            setActivePowerUp(null)
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [activePowerUp, powerUpTimeLeft])

  // Handle block hit for effects
  const handleBlockHit = useCallback(
    (position: [number, number, number], blockType: BlockType) => {
      try {
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
      } catch (error) {
        console.error("Error handling block hit:", error)
      }
    },
    [clickIntensity],
  )

  const backToMenu = useCallback(() => {
    try {
      setGameState("start")
    } catch (error) {
      console.error("Error going back to menu:", error)
      // Force reload as last resort
      window.location.reload()
    }
  }, [])

  // If there's a game error, show a simple error screen
  if (gameError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-red-900 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">Game Error</h1>
        <p className="mb-6">{gameError}</p>
        <button className="px-4 py-2 bg-white text-red-900 rounded font-bold" onClick={() => window.location.reload()}>
          Reload Game
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-screen relative">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />

        {gameState === "start" && <StartScene onStartGame={startGame} />}

        {gameState === "playing" && (
          <GameScene
            level={level}
            score={score}
            timeLeft={timeLeft}
            blocks={blocks}
            powerUps={powerUps}
            combo={combo}
            activePowerUp={activePowerUp}
            powerUpTimeLeft={powerUpTimeLeft}
            onBlockDestroy={handleBlockDestroy}
            onBlockDamage={handleBlockDamage}
            clickIntensity={clickIntensity}
            onBlockHit={handleBlockHit}
            onPowerUpCollect={handlePowerUpCollect}
            isLowPerformance={isLowPerformance}
          />
        )}

        {gameState === "levelComplete" && (
          <LevelCompleteScene
            level={level}
            score={score}
            onNextLevel={startNextLevel}
            isLowPerformance={isLowPerformance}
          />
        )}

        {gameState === "gameOver" && (
          <GameOverScene
            score={score}
            onRestart={startGame}
            onBackToMenu={backToMenu}
            isLowPerformance={isLowPerformance}
          />
        )}

        {gameState === "gameComplete" && (
          <GameCompleteScene
            score={score}
            onRestart={startGame}
            onBackToMenu={backToMenu}
            isLowPerformance={isLowPerformance}
          />
        )}

        <EffectComposer enabled={!isLowPerformance && !isMobile}>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={100} intensity={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

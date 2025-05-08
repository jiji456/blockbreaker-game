"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
// เพิ่ม import สำหรับองค์ประกอบ 3D เพิ่มเติม
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
    linearDamping: 0.9, // เพิ่มการหน่วงเพื่อลดการเคลื่อนไหว
    angularDamping: 0.9, // เพิ่มการหน่วงการหมุน
  }))

  const [localHealth, setLocalHealth] = useState(health)
  const [isHovered, setIsHovered] = useState(false)
  const [isHit, setIsHit] = useState(false)
  const isMobile = useMobile()

  // อัปเดต localHealth เมื่อ health จากภายนอกเปลี่ยน
  useEffect(() => {
    setLocalHealth(health)
  }, [health])

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

    // Apply force to make it look like it was hit - ลดแรงลง
    api.applyImpulse([0, 3, 0], [0, 0, 0]) // ลดลงจาก 5

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
    setTimeout(() => setIsHit(false), 200) // ลดลงจาก 300
  }

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={() => !isMobile && setIsHovered(true)}
      onPointerOut={() => !isMobile && setIsHovered(false)}
      scale={isHit ? 0.95 : isHovered ? 1.03 : 1} // ลดการเปลี่ยนขนาด
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={getWoodColor()}
        roughness={0.7}
        metalness={0.1}
        emissive={isHit ? "#ff9500" : isHovered ? "#ffcc00" : "#000000"}
        emissiveIntensity={isHit ? 0.3 : isHovered ? 0.1 : 0} // ลดความเข้มลง
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
function HitEffect({
  position,
  intensity = 1,
  isLowPerformance = false,
}: { position: [number, number, number]; intensity?: number; isLowPerformance?: boolean }) {
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

  // ลดจำนวน particles บนอุปกรณ์ประสิทธิภาพต่ำ
  if (isLowPerformance) {
    return (
      <group ref={groupRef} position={position}>
        <mesh>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
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

// เพิ่มฟังก์ชัน FloatingWoodChip สำหรับเศษไม้ลอยในฉาก - แก้ไขให้ไม่ใช้ฟิสิกส์
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

      {/* วงปีไม้ชั้นใน */}
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
  onBlockDestroy,
  onBlockDamage,
  clickIntensity,
  onBlockHit,
  isLowPerformance,
}: {
  level: number
  score: number
  timeLeft: number
  blocks: any[]
  onBlockDestroy: (id: number) => void
  onBlockDamage: (id: number) => void
  clickIntensity: number
  onBlockHit: (position: [number, number, number]) => void
  isLowPerformance: boolean
}) {
  const { camera } = useThree()
  const [hitEffects, setHitEffects] = useState<{ id: number; position: [number, number, number] }[]>([])
  const effectIdCounter = useRef(0)
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
      // Apply camera shake - ปรับปรุงให้สั่นมากขึ้น
      const time = clock.getElapsedTime() * 30 // เพิ่มความถี่
      const shakeX = Math.sin(time) * cameraShakeRef.current.intensity * 0.3
      const shakeY = Math.cos(time * 1.2) * cameraShakeRef.current.intensity * 0.2
      const shakeZ = Math.sin(time * 0.7) * cameraShakeRef.current.intensity * 0.15

      camera.position.x += (cameraShakeRef.current.x + shakeX - camera.position.x) * 0.2
      camera.position.y += (10 + shakeY - camera.position.y) * 0.2
      camera.position.z += (10 + shakeZ - camera.position.z) * 0.2

      // ลดความเข้มของการสั่นช้าลง
      cameraShakeRef.current.intensity *= 0.92
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

    // ลดจำนวน wood chips ลงอย่างมาก
    // ไม่สร้าง wood chips เลยถ้าเป็นอุปกรณ์ประสิทธิภาพต่ำ
    if (!isLowPerformance) {
      const chipCount = 1 // เหลือแค่ 1 ชิ้น
      const newChips = []

      for (let i = 0; i < chipCount; i++) {
        const offset = [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5]

        newChips.push({
          id: woodChipCounter.current++,
          position: [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]] as [
            number,
            number,
            number,
          ],
          scale: 0.5 + Math.random() * 0.5,
        })
      }

      setWoodChips((prev) => [...prev, ...newChips])

      // ลบ wood chips เก่าทิ้งเร็วขึ้น
      if (woodChips.length > 5) {
        setWoodChips((prev) => prev.slice(prev.length - 5))
      }
    }

    // Remove effect after animation - ลดเวลาลง
    setTimeout(() => {
      setHitEffects((prev) => prev.filter((effect) => effect.id !== newEffectId))
    }, 300) // ลดลงจาก 800ms

    // Apply camera shake - ลดความเข้มลง
    cameraShakeRef.current = {
      x: position[0] * 0.1, // ลดลงจาก 0.2
      y: position[1] * 0.05, // ลดลงจาก 0.1
      intensity: 0.3 * clickIntensity, // ลดลงจาก 0.5
    }

    // Pass to parent component
    onBlockHit(position)
  }

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

      {/* สภาพแวดล้อมตามระดับ - ลดความซับซ้อนบนอุปกรณ์ประสิทธิภาพต่ำ */}
      {environment === "day" && <Sky sunPosition={[0, 1, 0]} />}
      {environment === "sunset" && <Sky sunPosition={[0, 0.2, -1]} />}
      {environment === "night" && (
        <Stars
          radius={100}
          depth={50}
          count={isLowPerformance ? 2000 : 5000}
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
        <ParticleEffect
          key={effect.id}
          position={effect.position}
          intensity={clickIntensity}
          isLowPerformance={isLowPerformance}
        />
      ))}

      {/* Wood chips - ลดจำนวนบนอุปกรณ์ประสิทธิภาพต่ำ */}
      {woodChips.map((chip) => (
        <FloatingWoodChip key={chip.id} position={chip.position} scale={chip.scale} />
      ))}

      <Physics
        // ปรับแต่งการตั้งค่าฟิสิกส์ให้เบาลง
        iterations={isLowPerformance ? 3 : 5} // ลดลงจาก 10
        tolerance={0.002} // เพิ่มค่า tolerance
        defaultContactMaterial={{
          friction: 0.2, // ลดความเสียดทาน
          restitution: 0.3, // ลดการกระเด้ง
        }}
        gravity={[0, -3, 0]} // ลดแรงโน้มถ่วงลง
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

      {/* องค์ประกอบตกแต่งเพิ่มเติม - ลดจำนวนบนอุปกรณ์ประสิทธิภาพต่ำ */}
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
        enableDamping={true}
        dampingFactor={0.05}
        enableRotate={!isMobile} // ปิดการหมุนบนมือถือ
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

    // Gentle camera movement - ลดความซับซ้อนบนมือถือ
    if (!isMobile) {
      camera.position.x = Math.sin(time * 0.2) * 2
      camera.position.y = 5 + Math.sin(time * 0.1) * 0.5
      camera.position.z = 10 + Math.cos(time * 0.15) * 1
    }

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
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Stars radius={100} depth={50} count={isMobile ? 2000 : 5000} factor={4} saturation={0} fade speed={1} />

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

      {/* Decorative trees - ลดจำนวนบนมือถือ */}
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
    onNextLevel()
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

      <Stars radius={100} depth={50} count={isLowPerformance ? 2000 : 5000} factor={4} saturation={0} fade speed={1} />

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
              <boxGeometry args={[4, 0.8, 0.1]} />
              <meshStandardMaterial color="#000000" opacity={0.7} transparent={true} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              backgroundColor="#00000000"
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
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
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
    onRestart()
  }

  const handleBackToMenu = () => {
    onBackToMenu()
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

      <Stars radius={100} depth={50} count={isLowPerformance ? 2000 : 5000} factor={4} saturation={0} fade speed={1} />

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
      <group position={[0, 0, 0]} onClick={handleBackToMenu}>
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

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
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
    onRestart()
  }

  const handleBackToMenu = () => {
    onBackToMenu()
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

      <Stars radius={100} depth={50} count={isLowPerformance ? 2000 : 5000} factor={4} saturation={0} fade speed={1} />

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
      <group position={[0, 0, 0]} onClick={handleBackToMenu}>
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

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
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
    // ลดจำนวน particles ลงเหลือแค่ 2-3 อัน
    const particleCount = Math.floor((isLowPerformance ? 2 : 3) * intensity)

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
  const [blocksDestroyed, setBlocksDestroyed] = useState(0)
  const [totalBlocksDestroyed, setTotalBlocksDestroyed] = useState(0)
  const [clickIntensity, setClickIntensity] = useState(1)
  const lastClickTimeRef = useRef(0)
  const [hitPositions, setHitPositions] = useState<[number, number, number][]>([])
  const [isLowPerformance, setIsLowPerformance] = useState(false)
  const isMobile = useMobile()

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

      // ตรวจสอบ FPS
      let lastTime = performance.now()
      let frames = 0
      let testDuration = 0
      let lowFps = false

      const checkFps = () => {
        const now = performance.now()
        frames++
        testDuration += now - lastTime
        lastTime = now

        if (testDuration >= 500) {
          // ทดสอบแค่ 0.5 วินาที
          const fps = (frames * 1000) / testDuration
          lowFps = fps < 40

          // ตัดสินใจจากข้อมูลทั้งหมด
          const isLowPerf = lowFps || lowMemory || cpuCores <= 4 || isMobile
          setIsLowPerformance(isLowPerf)
          return
        }

        requestAnimationFrame(checkFps)
      }

      requestAnimationFrame(checkFps)
    }

    checkPerformance()
  }, [])

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
        rows = Math.max(2, Math.floor(rows * 0.7))
        columns = Math.max(2, Math.floor(columns * 0.7))
        layers = Math.max(1, Math.floor(layers * 0.7))
      }

      return {
        blockCount: isLowPerformance ? Math.floor(totalBlocks * 0.7) : totalBlocks,
        blockHealth: Math.ceil(level * 1.2),
        timeLimit: 10, // 10 seconds per level
        rows,
        columns,
        layers,
      }
    },
    [isLowPerformance],
  )

  // Initialize level
  const initializeLevel = useCallback(() => {
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
  }, [level, getLevelConfig])

  // Start game
  const startGame = useCallback(() => {
    setLevel(1)
    setScore(0)
    setTotalBlocksDestroyed(0)
    setTimeout(() => {
      initializeLevel()
    }, 0)
  }, [initializeLevel])

  // Start next level
  const startNextLevel = useCallback(() => {
    setLevel((prev) => prev + 1)
    setTimeout(() => {
      initializeLevel()
    }, 0)
  }, [initializeLevel])

  // Handle block destroy
  const handleBlockDestroy = useCallback(
    (id: number) => {
      // Find the block that was destroyed
      setBlocks((currentBlocks) => {
        const destroyedBlock = currentBlocks.find((block) => block.id === id)
        if (!destroyedBlock) return currentBlocks

        // Find all blocks that should be affected (including the destroyed one)
        const [x, y, z] = destroyedBlock.position

        // Create a map of blocks to process with their damage amounts
        const blocksToProcess = new Map()

        // Add the destroyed block
        blocksToProcess.set(id, destroyedBlock.health)

        // ลดรัศมีผลกระทบลงเพื่อลดจำนวนบล็อกที่ได้รับผลกระทบ
        const effectRadius = isLowPerformance ? 1.2 : 1.5 // ลดลงจาก 2

        // Find nearby blocks for area effect
        currentBlocks.forEach((block) => {
          if (block.id !== id) {
            const [bx, by, bz] = block.position
            const distance = Math.sqrt(Math.pow(x - bx, 2) + Math.pow(y - by, 2) + Math.pow(z - bz, 2))

            // If block is close enough, add it to the processing list
            if (distance < effectRadius) {
              // Closer blocks take more damage
              const damage = distance < 0.8 ? 2 : 1 // ลดลงจาก 1
              blocksToProcess.set(block.id, damage)
            }
          }
        })

        // Process all blocks at once to avoid recursion
        let destroyedCount = 0
        let updatedBlocks = [...currentBlocks]

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
        setBlocksDestroyed((prev) => prev + destroyedCount)
        setTotalBlocksDestroyed((prev) => prev + destroyedCount)
        setScore((prev) => prev + level * 10 * destroyedCount)

        // Check if level is complete
        if (updatedBlocks.length === 0) {
          setGameState("levelComplete")
          setTimeLeft(0)
        }

        return updatedBlocks
      })
    },
    [level, isLowPerformance],
  )

  // Handle block damage
  const handleBlockDamage = useCallback((id: number) => {
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
  }, [])

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameState === "playing" && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1
          if (newTime === 0) {
            // Time's up
            setGameState("gameOver")
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameState, timeLeft])

  // Handle block hit for effects
  const handleBlockHit = useCallback(
    (position: [number, number, number]) => {
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
    },
    [clickIntensity],
  )

  const backToMenu = useCallback(() => {
    setGameState("start")
  }, [])

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
            onBlockDestroy={handleBlockDestroy}
            onBlockDamage={handleBlockDamage}
            clickIntensity={clickIntensity}
            onBlockHit={handleBlockHit}
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
          <Bloom
            luminanceThreshold={0.3} // เพิ่มขึ้นจาก 0.2
            luminanceSmoothing={0.9}
            height={100} // ลดลงจาก 300
            intensity={0.8} // ลดลงจาก 1.5
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

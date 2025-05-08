import dynamic from "next/dynamic"

// ใช้ dynamic import เพื่อป้องกันปัญหา SSR
const BlockBreaker = dynamic(() => import("@/components/block-breaker-3d"), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-xl">กำลังโหลดเกม...</p>
    </div>
  )
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 overflow-hidden bg-black">
      <BlockBreaker />
    </main>
  )
}

"use client"

import dynamic from "next/dynamic"

// ใช้ dynamic import เพื่อป้องกันปัญหา SSR
const BlockBreaker = dynamic(() => import("@/components/block-breaker-3d"), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <p className="text-xl mb-4">กำลังโหลดเกม...</p>
      <p className="text-sm text-gray-400">อาจใช้เวลาสักครู่ โปรดรอสักครู่</p>
      <div className="mt-4 w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 animate-pulse rounded-full"></div>
      </div>
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

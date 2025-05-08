"use client"

import { useState, useEffect } from "react"

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // ตรวจสอบว่าเป็นมือถือหรือไม่
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i

      // ตรวจสอบจาก User Agent
      const isMobileDevice = mobileRegex.test(userAgent.toLowerCase())

      // ตรวจสอบจากขนาดหน้าจอ
      const isMobileScreen = window.innerWidth < 768

      setIsMobile(isMobileDevice || isMobileScreen)
    }

    // ตรวจสอบตอนโหลดหน้า
    checkMobile()

    // ตรวจสอบเมื่อมีการเปลี่ยนขนาดหน้าจอ
    window.addEventListener("resize", checkMobile)

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return isMobile
}

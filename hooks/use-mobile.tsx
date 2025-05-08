"use client"

import { useState, useEffect } from "react"

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // ตรวจสอบว่าเป็นมือถือหรือไม่
    const checkMobile = () => {
      // ตรวจสอบจาก User Agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
      const isMobileDevice = mobileRegex.test(userAgent.toLowerCase())

      // ตรวจสอบจากขนาดหน้าจอ
      const isMobileScreen = window.innerWidth < 768

      // ตรวจสอบจาก touch capability
      const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0

      setIsMobile(isMobileDevice || isMobileScreen || hasTouchScreen)
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

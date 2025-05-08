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

      // ตรวจสอบจากขนาดหน้าจอ - เพิ่มความเข้มงวด
      const isMobileScreen = window.innerWidth < 1024 // เพิ่มจาก 768 เป็น 1024 เพื่อให้อุปกรณ์ที่มีหน้าจอขนาดกลางถูกจัดเป็นมือถือด้วย

      // ตรวจสอบจาก touch capability
      const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0

      // ตรวจสอบจากประสิทธิภาพ
      const hasLowPerformance = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : true

      setIsMobile(isMobileDevice || isMobileScreen || hasTouchScreen || hasLowPerformance)
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

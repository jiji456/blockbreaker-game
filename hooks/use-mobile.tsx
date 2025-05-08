"use client"

import { useState, useEffect } from "react"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Function to check if the device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex =
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i

      // Check if screen width is less than 768px (typical mobile breakpoint)
      const isSmallScreen = window.innerWidth < 768

      // Return true if either the user agent matches mobile patterns or the screen is small
      return mobileRegex.test(userAgent) || isSmallScreen
    }

    // Set initial value
    setIsMobile(checkMobile())

    // Add event listener for window resize
    const handleResize = () => {
      setIsMobile(checkMobile())
    }

    window.addEventListener("resize", handleResize)

    // Clean up event listener
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return isMobile
}

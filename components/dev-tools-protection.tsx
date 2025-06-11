"use client"

import { useEffect } from 'react'

export function DevToolsProtection() {
  useEffect(() => {
    // Disable right-click context menu
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Disable common developer tools keyboard shortcuts
    const disableDevToolsKeys = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+S (Save)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+A (Select All)
      if (e.ctrlKey && e.keyCode === 65) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+P (Print)
      if (e.ctrlKey && e.keyCode === 80) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+K (Firefox Console)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 75) {
        e.preventDefault()
        return false
      }
      
      // F1 (Help)
      if (e.keyCode === 112) {
        e.preventDefault()
        return false
      }
    }

    // Disable text selection
    const disableSelection = () => {
      document.onselectstart = () => false
      document.ondragstart = () => false
    }

    // Detect dev tools opening
    const detectDevTools = () => {
      const threshold = 160
      let devtools = false

      setInterval(() => {
        if (
          window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold
        ) {
          if (!devtools) {
            devtools = true
            handleDevToolsDetected()
          }
        } else {
          devtools = false
        }
      }, 500)

      // Console detection
      let devtools2 = {
        open: false,
        orientation: null as string | null
      }

      const threshold2 = 160

      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold2) {
          if (!devtools2.open || devtools2.orientation === 'horizontal') {
            devtools2.open = true
            devtools2.orientation = 'vertical'
            handleDevToolsDetected()
          }
        } else if (window.outerWidth - window.innerWidth > threshold2) {
          if (!devtools2.open || devtools2.orientation === 'vertical') {
            devtools2.open = true
            devtools2.orientation = 'horizontal'
            handleDevToolsDetected()
          }
        } else {
          if (devtools2.open) {
            devtools2.open = false
            devtools2.orientation = null
          }
        }
      }, 500)
    }

    // Handle when dev tools are detected
    const handleDevToolsDetected = () => {
      // Redirect to about:blank
      window.location.href = 'about:blank'
      
      // Alternative: Close the window
      // window.close()
      
      // Alternative: Redirect to a different page
      // window.location.href = 'https://google.com'
      
      // Alternative: Show alert and reload
      // alert('Developer tools detected!')
      // window.location.reload()
    }

    // Console warning detection
    const consoleDetection = () => {
      let devtools3 = false
      const element = new Image()
      
      Object.defineProperty(element, 'id', {
        get: function() {
          devtools3 = true
          handleDevToolsDetected()
          return 'devtools-detected'
        }
      })
      
      setInterval(() => {
        devtools3 = false
        console.log(element)
        console.log(element)
        console.clear()
      }, 1000)
    }

    // Disable drag and drop
    const disableDragDrop = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // Add event listeners
    document.addEventListener('contextmenu', disableRightClick)
    document.addEventListener('keydown', disableDevToolsKeys)
    document.addEventListener('dragstart', disableDragDrop)
    document.addEventListener('drop', disableDragDrop)
    
    // Initialize protections
    disableSelection()
    detectDevTools()
    consoleDetection()

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', disableRightClick)
      document.removeEventListener('keydown', disableDevToolsKeys)
      document.removeEventListener('dragstart', disableDragDrop)
      document.removeEventListener('drop', disableDragDrop)
    }
  }, [])

  return null
}

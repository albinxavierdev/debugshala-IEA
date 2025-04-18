"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Home, FileText, CheckCircle } from 'lucide-react'

// Helper to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage
  }
  return undefined
}

export function AssessmentNav() {
  const pathname = usePathname()
  const [hasCompletedTest, setHasCompletedTest] = useState(false)
  
  useEffect(() => {
    const storage = getLocalStorage()
    const testCompleted = storage?.getItem('debugshala_test_completed') === 'true'
    setHasCompletedTest(testCompleted)
    
    // Add a storage event listener to detect changes to localStorage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'debugshala_test_completed') {
        const newValue = event.newValue === 'true'
        setHasCompletedTest(newValue)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])
  
  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: <Home className="h-4 w-4 mr-1" />
    },
    {
      name: 'Assessment',
      href: '/assessment',
      icon: <FileText className="h-4 w-4 mr-1" />,
      isActive: pathname.startsWith('/assessment') && 
                pathname !== '/assessment/complete'
    },
    {
      name: 'Completion',
      href: '/assessment/complete',
      icon: <CheckCircle className="h-4 w-4 mr-1" />,
      isActive: pathname === '/assessment/complete',
      disabled: !hasCompletedTest
    }
  ]
  
  return (
    <div className="flex items-center justify-center mb-6 mt-4">
      <div className="bg-muted/30 rounded-full px-1 py-1 shadow-sm border">
        {navItems.map((item) => {
          const isActive = item.isActive !== undefined 
            ? item.isActive 
            : pathname === item.href
            
          if (item.disabled) {
            return (
              <Button
                key={item.name}
                variant="ghost"
                className="rounded-full px-4 py-2 text-muted-foreground cursor-not-allowed opacity-50"
                disabled
              >
                {item.icon}
                {item.name}
              </Button>
            )
          }
          
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "rounded-full px-4 py-2",
                  isActive 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.icon}
                {item.name}
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  )
} 
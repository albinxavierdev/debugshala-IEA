"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  ChevronDown, 
  MessageCircle, 
  Building, 
  DollarSign, 
  Users, 
  FileCog, 
  Code, 
  GraduationCap,
  Briefcase, 
  Award,
  ExternalLink
} from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function Navbar() {
  const pathname = usePathname()
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false)
  const [talentDropdownOpen, setTalentDropdownOpen] = useState(false)

  return (
    <header className="sticky inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-lg transition-all">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1">
            <Image 
              src="/images/dslogo.svg" 
              alt="DebugShala Logo" 
              width={140} 
              height={40} 
              priority
            />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-1"
        >
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {/* For Companies Dropdown */}
            <div className="relative">
              <button 
                className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setCompanyDropdownOpen(!companyDropdownOpen)
                  setTalentDropdownOpen(false)
                }}
              >
                <Building className="mr-1 h-4 w-4" /> For Companies <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              {companyDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white shadow-lg rounded-md py-2 z-50">
                  <Link href="/companies/zero-cost-hiring" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" /> Zero Cost Hiring
                  </Link>
                  <Link href="/companies/dedicated-resources" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <Users className="mr-2 h-4 w-4" /> Dedicated Resources
                  </Link>
                  <Link href="/companies/contractual-hiring" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <FileCog className="mr-2 h-4 w-4" /> Contractual Hiring
                  </Link>
                </div>
              )}
            </div>
            
            {/* For Talent Dropdown */}
            <div className="relative">
              <button 
                className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setTalentDropdownOpen(!talentDropdownOpen)
                  setCompanyDropdownOpen(false)
                }}
              >
                <GraduationCap className="mr-1 h-4 w-4" /> For Talent <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              {talentDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white shadow-lg rounded-md py-2 z-50">
                  <Link href="/talent/coding-for-kids" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <Code className="mr-2 h-4 w-4" /> Coding for Kids
                  </Link>
                  <Link href="/talent/upskill-programs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <GraduationCap className="mr-2 h-4 w-4" /> Upskill Programs
                  </Link>
                  <Link href="/talent/placement-assisted-programs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <Briefcase className="mr-2 h-4 w-4" /> Placement Assisted Programs
                  </Link>
                </div>
              )}
            </div>
            
            <Link
              href="/success-stories"
              className={`transition-colors hover:text-primary flex items-center ${
                pathname === "/success-stories" ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <Award className="mr-1 h-4 w-4" /> Success Stories
            </Link>
          </nav>
          <div className="hidden sm:block">
            <Link href="https://www.debugshala.com" target="_blank" rel="noopener noreferrer">
              <Button className="ml-4 gap-1">
                Explore More <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </header>
  )
} 
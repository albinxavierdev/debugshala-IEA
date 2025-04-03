"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import Script from "next/script"
import { ChevronRight, Brain, Briefcase, LineChart, Clock, CheckCircle2, Code, Globe, Award, Rocket, LightbulbIcon, Zap, Sparkles, Target, TrendingUp } from "lucide-react"
import { Navbar } from "@/components/ui/navbar"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Script src="https://wb.bizfy.in/popup/whatsapp?id=6SKG2rp27R" strategy="afterInteractive" />
      <div id="embed-whatsapp-chat"></div>
      
      <Navbar />
      
      {/* Hero Section with Animated Background */}
      <div className="relative bg-gradient-to-b from-primary/10 via-background/50 to-background overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.7 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-block mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }}
                className="bg-primary/10 p-3 rounded-full inline-flex"
              >
                <Sparkles className="h-6 w-6 text-primary" />
              </motion.div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold text-primary mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                DebugShala
              </span>
              <br/>
              <span className="text-foreground">Interactive Employability Assessment</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed">
              Our AI-powered platform evaluates your skills and provides 
              <span className="text-primary font-medium"> personalized career recommendations</span>
            </p>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="inline-block"
            >
              <Link href="/assessment">
                <Button size="lg" className="text-lg px-10 py-7 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 shadow-lg transition-all duration-300">
                  Take Your Assessment Now! <ChevronRight className="ml-2" />
                </Button>
          </Link>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-6 text-sm text-muted-foreground"
            >
              Free assessment • 60 minutes • Detailed report
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Features Section with Cards */}
      <div className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-block mb-4">
            <div className="bg-primary/10 p-3 rounded-full inline-flex">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our AI-Powered Assessment Platform</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock your potential with our comprehensive assessment tools and get insights tailored to your career goals
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -8 }}
            className="bg-card rounded-2xl p-8 shadow-lg border border-primary/10 group hover:border-primary/30 transition-all duration-300"
          >
            <div className="bg-primary/10 p-4 rounded-xl w-fit mb-6 group-hover:bg-primary/20 transition-all duration-300">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">AI-Powered Assessment</h3>
            <p className="text-muted-foreground">
              Our AI technology dynamically generates personalized questions based on your profile and interests, creating a truly customized experience.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -8 }}
            className="bg-card rounded-2xl p-8 shadow-lg border border-primary/10 group hover:border-primary/30 transition-all duration-300"
          >
            <div className="bg-primary/10 p-4 rounded-xl w-fit mb-6 group-hover:bg-primary/20 transition-all duration-300">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">Comprehensive Skills Evaluation</h3>
            <p className="text-muted-foreground">
              Evaluate aptitude, programming, and essential employability skills that top employers actively seek in today's competitive job market.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ y: -8 }}
            className="bg-card rounded-2xl p-8 shadow-lg border border-primary/10 group hover:border-primary/30 transition-all duration-300"
          >
            <div className="bg-primary/10 p-4 rounded-xl w-fit mb-6 group-hover:bg-primary/20 transition-all duration-300">
              <LineChart className="h-8 w-8 text-primary" />
          </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">Detailed Visual Reports</h3>
            <p className="text-muted-foreground">
              Receive in-depth analysis with interactive charts, skill gap assessments, and personalized career recommendations tailored to your profile.
            </p>
          </motion.div>
        </div>

        {/* Assessment Structure */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-gradient-to-r from-card to-card/80 rounded-2xl p-10 border border-primary/10 shadow-xl mb-20"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="bg-primary/10 p-3 rounded-full mb-4">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-center">Assessment Structure <span className="text-primary">(60 Minutes)</span></h3>
            <div className="h-1 w-20 bg-primary/30 rounded-full mt-4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background/50 p-6 rounded-xl border border-primary/5 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-xl flex-shrink-0 mt-1">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-2">Aptitude & Reasoning</h4>
                  <div className="flex items-center text-sm text-muted-foreground mb-3 bg-background/50 rounded-full px-3 py-1 w-fit">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    <span>15 Minutes</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Logical reasoning</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Numerical ability</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Problem-solving</span>
                    </li>
                  </ul>
          </div>
        </div>
      </div>

            <div className="bg-background/50 p-6 rounded-xl border border-primary/5 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-xl flex-shrink-0 mt-1">
                  <Code className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-2">General Programming</h4>
                  <div className="flex items-center text-sm text-muted-foreground mb-3 bg-background/50 rounded-full px-3 py-1 w-fit">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    <span>15 Minutes</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Basic coding</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Algorithmic thinking</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Programming concepts</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-background/50 p-6 rounded-xl border border-primary/5 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-xl flex-shrink-0 mt-1">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-2">Employability Skills</h4>
                  <div className="flex items-center text-sm text-muted-foreground mb-3 bg-background/50 rounded-full px-3 py-1 w-fit">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    <span>30 Minutes</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Core employability</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Soft & professional skills</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>Domain-specific knowledge</span>
                    </li>
                  </ul>
                </div>
          </div>
            </div>
          </div>
        </motion.div>
        
        {/* CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mb-10"
        >
          <Link href="/assessment">
            <Button size="lg" className="px-10 py-6 text-lg rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 shadow-lg transition-all duration-300">
              Start Your Assessment <Zap className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
      
      {/* Why DebugShala Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background py-24">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-4">
              <div className="bg-primary/10 p-3 rounded-full inline-flex">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why DebugShala?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We combine cutting-edge AI technology with industry expertise to provide the most accurate assessment of your skills
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-card rounded-xl p-6 border border-primary/10 shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary/30"
            >
              <div className="mb-5 bg-primary/10 p-4 rounded-xl inline-flex">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Driven Personalized Assessments</h3>
              <p className="text-muted-foreground">Custom questions tailored to your profile, educational background, and career interests</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -5 }}
              className="bg-card rounded-xl p-6 border border-primary/10 shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary/30"
            >
              <div className="mb-5 bg-primary/10 p-4 rounded-xl inline-flex">
                <LineChart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-Time Insights & Analysis</h3>
              <p className="text-muted-foreground">Identify strengths and areas for improvement with precision and actionable recommendations</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -5 }}
              className="bg-card rounded-xl p-6 border border-primary/10 shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary/30"
            >
              <div className="mb-5 bg-primary/10 p-4 rounded-xl inline-flex">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Interactive Visual Reports</h3>
              <p className="text-muted-foreground">Colorful charts and graphs to visualize your performance and compare with industry standards</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ y: -5 }}
              className="bg-card rounded-xl p-6 border border-primary/10 shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary/30"
            >
              <div className="mb-5 bg-primary/10 p-4 rounded-xl inline-flex">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Career Recommendations</h3>
              <p className="text-muted-foreground">Personalized learning paths, resources, and job opportunity suggestions aligned to your skills</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-indigo-500/30 opacity-20"></div>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-block mb-6">
              <div className="bg-primary/10 p-3 rounded-full inline-flex">
                <Zap className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Discover Your Potential?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Take the assessment today and unlock personalized insights about your skills, strengths, and career opportunities
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} className="w-full sm:w-auto">
                <Link href="/assessment">
                  <Button size="lg" className="w-full sm:w-auto px-10 py-6 text-lg font-medium rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 shadow-lg">
                    Start Your Assessment <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} className="w-full sm:w-auto">
                <Link href="#">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-10 py-6 text-lg font-medium rounded-xl border-primary/20 hover:bg-primary/5 hover:border-primary/30">
                    Learn More
                  </Button>
                </Link>
              </motion.div>
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-8">
              <div className="flex items-center text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
                <span>Free Assessment</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
                <span>Detailed Report</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
                <span>Career Guidance</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-20 bg-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 md:mb-0">
              <Link href="/">
                <Image 
                  src="/images/dslogo.svg" 
                  alt="DebugShala Logo" 
                  width={140} 
                  height={40} 
                  priority
                />
              </Link>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <Link href="/assessment" className="text-sm text-primary hover:underline">
                Start Assessment
              </Link>
              <Link href="https://www.debugshala.com/about" className="text-sm text-muted-foreground hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">
                About Us
              </Link>
              <Link href="https://www.debugshala.com/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </Link>
              <Link href="https://www.debugshala.com/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} DebugShala. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Brain, Code, Briefcase, AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { assessmentService } from '@/lib/assessment-service';

// Helper to safely access localStorage (only in browser)
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return undefined;
};

export default function InstructionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  // Check if user has already completed a test
  useEffect(() => {
    const storage = getLocalStorage();
    const testCompleted = storage?.getItem('debugshala_test_completed') === 'true';
    
    if (testCompleted) {
      // If test completed, redirect to completion page
      router.push('/assessment/complete');
    } else {
      setCheckingCompletion(false);
    }
  }, [router]);

  const handleStartTest = () => {
    setLoading(true);
    // Store start time in localStorage
    const storage = getLocalStorage();
    if (storage) {
      storage.setItem('testStartTime', new Date().toISOString());
    }
    router.push('/assessment/test');
  };

  // Show loading state while checking completion status
  if (checkingCompletion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-primary/5">
              <CardTitle className="text-3xl">Assessment Instructions</CardTitle>
              <CardDescription>
                Please read these instructions carefully before starting the assessment
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              <p className="text-muted-foreground">
                This AI-powered assessment consists of multiple sections with a total duration of 60 minutes:
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-card border rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Aptitude & Reasoning</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>15 Minutes</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Logical reasoning, numerical ability, and problem-solving questions
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-card border rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">General Programming</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>15 Minutes</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Basic coding concepts, algorithmic thinking, and programming fundamentals
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-card border rounded-lg p-4 shadow-sm md:col-span-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Employability Skills Assessment</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>30 Minutes</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Covers 8 key areas: Core Employability, Soft Skills, Professional Skills, 
                        AI Literacy, Job Application Skills, Entrepreneurial Skills, Domain-Specific Skills, 
                        and Project Management Basics.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-muted/30 rounded-lg p-4 border border-border"
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium mb-2">Important Notes:</h3>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>A built-in timer will track your remaining time for each section</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>You cannot return to previous sections once completed</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Ensure you have a stable internet connection</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Do not refresh or close the browser window during the assessment</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>The timer will start as soon as you begin the assessment</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Registration
                </Button>
                
                <Button
                  onClick={handleStartTest}
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    <>
                      Start Assessment <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
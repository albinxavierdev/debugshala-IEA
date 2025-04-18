"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle, ArrowLeft, Download } from 'lucide-react'
import { Navbar } from '@/components/ui/navbar'
import { AssessmentNav } from '@/components/ui/assessment-nav'

const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage
  }
  return undefined
}

export default function AssessmentCompletePage() {
  const router = useRouter()
  const [scores, setScores] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if test is completed
    const storage = getLocalStorage()
    const testCompleted = storage?.getItem('debugshala_test_completed') === 'true'
    
    if (!testCompleted) {
      // If test not completed, redirect to assessment page
      router.push('/assessment')
      return
    }
    
    // Load score data if available
    try {
      const scoresData = storage?.getItem('debugshala_assessment_scores')
      if (scoresData) {
        setScores(JSON.parse(scoresData))
      }
    } catch (error) {
      console.error('Error loading scores:', error)
    }
    
    setIsLoading(false)
  }, [router])

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <AssessmentNav />
      
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <Card className="p-8 shadow-lg">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Assessment Completed!</h1>
            <p className="text-muted-foreground max-w-lg">
              Thank you for completing the assessment. Your responses have been saved.
            </p>
          </div>

          {scores && (
            <div className="mb-8 border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Your Assessment Scores</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Aptitude</p>
                  <p className="text-2xl font-bold">{scores.aptitude}%</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Programming</p>
                  <p className="text-2xl font-bold">{scores.programming}%</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Employability</p>
                  <p className="text-2xl font-bold">
                    {typeof scores.employability === 'object' 
                      ? Math.round(Object.values(scores.employability).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0) / 
                          Object.keys(scores.employability).length) 
                      : scores.employability}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </Button>
            <Button
              variant="default"
              className="flex items-center gap-2"
              onClick={() => {
                // Clear test completion status
                const storage = getLocalStorage();
                if (storage) {
                  storage.removeItem('debugshala_test_completed');
                }
                router.push('/assessment');
              }}
            >
              Take Another Assessment
            </Button>
          </div>
        </Card>
      </div>
    </main>
  )
} 
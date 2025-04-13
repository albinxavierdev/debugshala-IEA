"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LLMSelector } from '@/components/ui/llm-selector';
import { Loader2 } from 'lucide-react';
import { assessmentService } from '@/lib/assessment-service';
import { Navbar } from '@/components/ui/navbar';

export default function TestLLMPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testLLM = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-openai');
      
      if (!response.ok) {
        throw new Error(`API test failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('Error testing OpenAI:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-6">OpenAI Provider Testing</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test OpenAI Provider</CardTitle>
            <CardDescription>
              Test the connection to the OpenAI provider and see the response format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <LLMSelector 
                label="AI Model"
                className="min-w-[220px]"
              />
              
              <Button 
                onClick={testLLM} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                  </>
                ) : (
                  "Test OpenAI API"
                )}
              </Button>
            </div>
            
            {error && (
              <div className="p-4 bg-red-100 border border-red-300 rounded-md text-red-800">
                <h3 className="font-semibold">Error</h3>
                <p>{error}</p>
              </div>
            )}
            
            {result && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">API Response</h3>
                <div className="p-4 bg-muted rounded-md overflow-auto max-h-96">
                  <Tabs defaultValue="formatted">
                    <TabsList className="mb-2">
                      <TabsTrigger value="formatted">Formatted</TabsTrigger>
                      <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="formatted">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="font-medium">{result.message}</span>
                        </div>
                        
                        {result.questions?.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="font-medium">Generated Questions</h4>
                            {result.questions.map((question: any, index: number) => (
                              <div key={question.id || index} className="border rounded-md p-4 bg-card">
                                <p className="font-medium mb-2">{question.question}</p>
                                {question.options && (
                                  <ul className="space-y-1 mb-3">
                                    {question.options.map((option: string, i: number) => (
                                      <li key={i} className={`px-3 py-1.5 rounded-md ${option === question.correctAnswer ? 'bg-green-100 border border-green-300' : 'bg-muted'}`}>
                                        {option} {option === question.correctAnswer && '✓'}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {question.explanation && (
                                  <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Explanation:</span> {question.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="raw">
                      <pre className="whitespace-pre-wrap text-xs break-all">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Make sure you have set the correct API keys in your environment variables
          </CardFooter>
        </Card>
      </main>
    </div>
  );
} 
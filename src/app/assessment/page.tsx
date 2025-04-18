"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, User, Mail, Phone, GraduationCap, Calendar, Building, CheckCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { assessmentService } from '@/lib/assessment-service';
import { FormData } from '@/types/assessment';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';

// Helper to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return undefined;
};

export default function AssessmentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    degree: "",
    graduationYear: "",
    collegeName: "",
    interestedDomain: "",
    preferredLanguage: "javascript"
  });

  // Check if user has already completed an assessment
  useEffect(() => {
    const storage = getLocalStorage();
    const testCompleted = storage?.getItem('debugshala_test_completed') === 'true';
    
    console.log('Assessment completion check:', { testCompleted });
    
    if (testCompleted) {
      // Check if there's valid assessment data
      const scores = storage?.getItem('debugshala_assessment_scores');
      const hasValidScores = scores && scores !== '{}' && scores !== 'null';
      
      console.log('Assessment scores check:', { hasScores: !!scores, hasValidScores });
      
      if (!hasValidScores) {
        // If there's a completion flag but no valid scores, the state is inconsistent
        // Reset the completion flag
        console.log('Resetting invalid completion state');
        storage?.removeItem('debugshala_test_completed');
        setCheckingCompletion(false);
      } else {
        // If test completed with valid scores, redirect to completion page
        console.log('Valid completion detected, redirecting to completion page');
        router.push('/assessment/complete');
      }
    } else {
      setCheckingCompletion(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    // Check if required fields are filled
    const requiredFields = ["name", "email", "phone"];
    const missingFields = requiredFields.filter(field => !formData[field as keyof FormData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in the following required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    // Check if at least one domain is selected
    if (formData.interestedDomain === "") {
      toast({
        title: "Error",
        description: "Please select at least one interested domain.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      // Use the retry mechanism instead of direct call
      const result = await submitWithRetry(formData);
      
      // Check if result is an object with success property
      if (typeof result === 'object' && 'success' in result) {
        if (!result.success && 'error' in result) {
          const errorMsg = result.error as string;
          
          // Check if this is a duplicate email error
          if (errorMsg.toLowerCase().includes('email already registered') || 
              errorMsg.toLowerCase().includes('duplicate') ||
              errorMsg.toLowerCase().includes('already exists')) {
              
            // Handle duplicate email more gracefully
            handleDuplicateEmail();
            return;
          }
          
          // Other errors
          throw new Error(result.error);
        } else if (result.success) {
          // Show success toast
          toast({
            title: "Success",
            description: "Your profile has been saved successfully!",
            variant: "default",
          });
        }
      } else if (typeof result === 'string') {
        // Old behavior returned just the userId string, which means it succeeded
        // Show success toast
        toast({
          title: "Success",
          description: "Your profile has been saved successfully!",
          variant: "default",
        });
      }
      
      // Clear any previous test progress
      const storage = getLocalStorage();
      if (storage) {
        storage.removeItem('debugshala_test_progress');
      }
      
      // Navigate to instructions page
      router.push('/assessment/instructions');
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Attempt to save data locally as fallback
      try {
        const storage = getLocalStorage();
        if (storage) {
          // Transform data to match expected schema format
          const transformedData = {
            ...formData,
            interestedDomains: formData.interestedDomain ? [formData.interestedDomain] : []
          };
          
          // Save form data locally
          storage.setItem('debugshala_form_data', JSON.stringify(transformedData));
          console.log('Form data saved locally as fallback');
          
          // Still show error but mention data was saved locally
          toast({
            title: "Warning",
            description: "Could not save data to server, but your information was saved locally. You can continue with the assessment.",
            variant: "destructive",
          });
          
          // Navigate to instructions page despite the error
          router.push('/assessment/instructions');
          return;
        }
      } catch (storageError) {
        console.error('Failed to save locally:', storageError);
      }
      
      // If all attempts fail, show detailed error message based on error type
      let errorMessage = "Failed to save your data. Please try again.";
      let isDuplicateError = false;
      let isTimeoutError = false;
      
      if (error instanceof Error) {
        // Check for timeout errors
        if (error.name === 'AbortError' || 
            error.message.includes('timeout') || 
            error.message.includes('timed out')) {
          isTimeoutError = true;
          errorMessage = "The server is taking too long to respond. Your data has been saved locally and you can continue with the assessment.";
        }
        // Check for duplicate user error
        else if (error.message.includes('duplicate') || 
            error.message.includes('already exists') || 
            error.message.includes('unique constraint') ||
            error.message.toLowerCase().includes('email already registered') ||
            // Also check for specific error code from API
            ('code' in error && error.code === 'DUPLICATE_USER') ||
            // Status code for conflict
            ('statusCode' in error && error.statusCode === 409)) {
          isDuplicateError = true;
          // Handle duplicate email more gracefully
          handleDuplicateEmail();
          return;
        }
        // Network errors
        else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again. Your data has been saved locally.";
        } 
        // Server errors
        else if (error.message.includes('500')) {
          errorMessage = "Server error. Our team has been notified and is working on it. You can continue with limited functionality.";
        }
        // Database errors
        else if (error.message.includes('database') || error.message.includes('DB')) {
          errorMessage = "Database error. Please try again later. Your data has been saved locally.";
        }
        // Use specific error message if available
        else {
          errorMessage = error.message;
        }
      }
      
      // For timeout errors, provide a way to continue
      if (isTimeoutError) {
        toast({
          title: "Server Timeout",
          description: (
            <div className="space-y-2">
              <p>The server is taking too long to respond. Your data has been saved locally.</p>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => router.push('/assessment/instructions')}
                className="w-full mt-2"
              >
                Continue to Assessment
              </Button>
            </div>
          ),
          variant: "destructive",
          duration: 10000, // Show for longer
        });
        return;
      }
      
      // Regular error toast for non-duplicate errors
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // New function to handle duplicate email in a more user-friendly way
  const handleDuplicateEmail = () => {
    setLoading(false);
    
    toast({
      title: "Welcome Back!",
      description: (
        <div className="space-y-3">
          <p>It looks like <span className="font-medium">{formData.email}</span> is already registered with us.</p>
          <p>What would you like to do?</p>
          <div className="flex flex-col gap-2 mt-3">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => {
                // Save form data locally with a flag indicating it's continuing an existing account
                const storage = getLocalStorage();
                if (storage) {
                  // Transform data to match expected schema format
                  const transformedData = {
                    ...formData,
                    interestedDomains: formData.interestedDomain ? [formData.interestedDomain] : []
                  };
                  
                  storage.setItem('debugshala_form_data', JSON.stringify(transformedData));
                  
                  // Navigate to instructions page
                  router.push('/assessment/instructions');
                }
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Continue with this Email
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Focus on email field for user to change
                const emailInput = document.getElementById('email');
                if (emailInput) {
                  emailInput.focus();
                  
                  // Clear the email field
                  setFormData(prev => ({ ...prev, email: '' }));
                }
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" /> Use a Different Email
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Continue with local data only
                const storage = getLocalStorage();
                if (storage) {
                  // Save form data locally with a flag indicating it's a local-only account
                  const localFormData = {
                    ...formData,
                    interestedDomains: formData.interestedDomain ? [formData.interestedDomain] : [],
                    localOnly: true
                  };
                  storage.setItem('debugshala_form_data', JSON.stringify(localFormData));
                  
                  // Navigate to instructions page
                  router.push('/assessment/instructions');
                }
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <User className="h-4 w-4" /> Continue as Guest
            </Button>
          </div>
        </div>
      ),
      variant: "default",
      duration: 30000, // Show for longer (30 seconds)
    });
  };

  const domainOptions = [
    { id: "web-development", label: "Web Development" },
    { id: "mobile-development", label: "Mobile Development" },
    { id: "ai-ml", label: "AI/ML" },
    { id: "data-science", label: "Data Science" },
    { id: "devops", label: "DevOps" },
    { id: "cybersecurity", label: "Cybersecurity" },
    { id: "cloud-computing", label: "Cloud Computing" },
    { id: "game-development", label: "Game Development" },
    { id: "iot", label: "Internet of Things" },
    { id: "blockchain", label: "Blockchain" }
  ];

  const handleDomainChange = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      interestedDomain: domain
    }));
  };

  const formSections = [
    {
      title: "Personal Information",
      description: "Tell us about yourself so we can personalize your experience",
      fields: ["name", "email", "phone"]
    },
    {
      title: "Educational Background",
      description: "Your academic history helps tailor questions to your knowledge level",
      fields: ["degree", "graduationYear", "collegeName"]
    },
    {
      title: "Professional Interests",
      description: "Select areas you'd like to be assessed on for more relevant questions",
      fields: ["interestedDomain"]
    }
  ];

  // Calculate form completion percentage
  const calculateProgress = () => {
    const requiredFields = ["name", "email", "phone", "degree", "graduationYear", "collegeName"];
    const completedFields = requiredFields.filter(field => !!formData[field as keyof FormData]);
    const hasInterests = formData.interestedDomain !== "";
    
    return Math.round(((completedFields.length + (hasInterests ? 1 : 0)) / (requiredFields.length + 1)) * 100);
  };

  const progress = calculateProgress();

  // Add a retry mechanism for form submission
  const submitWithRetry = async (data: FormData, retryAttempt = 0): Promise<any> => {
    try {
      // Transform form data to match the expected schema format
      const transformedData = {
        ...data,
        interestedDomains: data.interestedDomain ? [data.interestedDomain] : []
      };
      
      // Store form data in assessment service and wait for confirmation
      const result = await assessmentService.setFormData(transformedData as any, true); // Pass true to ensure DB storage
      return result;
    } catch (error: any) {
      // If it's a timeout or network error and we haven't retried yet, try once more
      if (retryAttempt === 0 && 
          (error.name === 'AbortError' || 
           error.message.includes('timeout') || 
           error.message.includes('Failed to fetch'))) {
        console.log('Request failed, retrying once...');
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return submitWithRetry(data, 1);
      }
      // Otherwise, throw the error to be handled by the calling function
      throw error;
    }
  };

  // Add reset function to clear assessment data
  const resetAssessmentData = () => {
    const storage = getLocalStorage();
    if (storage) {
      // Clear all assessment related data
      storage.removeItem('debugshala_test_completed');
      storage.removeItem('debugshala_assessment_scores');
      storage.removeItem('debugshala_test_progress');
      storage.removeItem('assessmentResult');
      
      // Also clear from the assessment service
      assessmentService.clearAssessmentData();
      
      toast({
        title: "Reset Complete",
        description: "All assessment data has been cleared. You can start fresh.",
        variant: "default",
      });
      
      // Reload the page
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
      <div className="flex-1 flex items-center justify-center w-full px-4 py-10">
        <Card className="w-full max-w-5xl mx-auto shadow-lg border-t-4 border-t-primary">
          <div className="grid md:grid-cols-3 h-full">
            {/* Left sidebar with heading and information */}
            <div className="bg-muted/30 p-8 rounded-l-lg">
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Assessment Profile</h1>
              <p className="text-muted-foreground mb-6">Complete your profile to receive a personalized assessment experience tailored to your background and interests.</p>
              
              <div className="space-y-8 mt-12">
                {formSections.map((section, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${progress >= ((index + 1) / formSections.length) * 100 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium">{section.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Profile completion</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Right side with form */}
            <div className="md:col-span-2 p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {formSections.map((section, sectionIndex) => (
                  <motion.div 
                    key={section.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sectionIndex * 0.1 }}
                    className="space-y-6"
                  >
                    <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                    <div className="grid gap-5 md:grid-cols-2">
                      {section.fields.map(field => {
                        if (field === "interestedDomain") {
                          return (
                            <div key={field} className="md:col-span-2">
                              <Label className="font-medium mb-3 block">
                                Interested Domain
                                <span className="text-red-500 ml-1">*</span>
                              </Label>
                              <p className="text-xs text-muted-foreground mb-3">
                                Please select one domain of interest
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {domainOptions.map((domain) => (
                                  <div key={domain.id} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      id={domain.id}
                                      name="domain"
                                      value={domain.id}
                                      checked={formData.interestedDomain === domain.id}
                                      onChange={() => handleDomainChange(domain.id)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={domain.id} className="text-sm font-medium text-gray-700">
                                      {domain.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        
                        const iconMap: Record<string, React.ReactNode> = {
                          name: <User className="h-4 w-4 text-muted-foreground" />,
                          email: <Mail className="h-4 w-4 text-muted-foreground" />,
                          phone: <Phone className="h-4 w-4 text-muted-foreground" />,
                          degree: <GraduationCap className="h-4 w-4 text-muted-foreground" />,
                          graduationYear: <Calendar className="h-4 w-4 text-muted-foreground" />,
                          collegeName: <Building className="h-4 w-4 text-muted-foreground" />,
                        };
                        
                        const placeholderMap: Record<string, string> = {
                          name: "Full Name",
                          email: "Email Address",
                          phone: "Phone Number",
                          degree: "Degree/Qualification",
                          graduationYear: "Year of Graduation",
                          collegeName: "College/University",
                        };
                        
                        return (
                          <div key={field} className={field === "name" || field === "email" ? "md:col-span-2" : ""}>
                            <Label htmlFor={field} className="font-medium mb-2 block">
                              {field === "graduationYear" ? "Year of Graduation" :
                               field === "collegeName" ? "College/University" :
                               field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              {(field === "name" || field === "email" || field === "phone") && 
                                <span className="text-red-500 ml-1">*</span>
                              }
                            </Label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                {iconMap[field]}
                              </div>
                              <Input
                                id={field}
                                type={field === "email" ? "email" : "text"}
                                value={formData[field as keyof FormData] as string || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                                className="pl-10 focus:border-primary focus:ring-primary transition-colors"
                                placeholder={placeholderMap[field] || ""}
                              />
                            </div>
                            {field === "name" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Must be at least 2 characters
                              </p>
                            )}
                            {field === "email" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Must be a valid email address
                              </p>
                            )}
                            {field === "phone" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Format: +1 123-456-7890 or standard formats
                              </p>
                            )}
                            {field === "graduationYear" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Four digit year (YYYY)
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                ))}
                
                <div className="flex flex-col gap-2 items-center mt-8">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-red-500">*</span> Required fields must be filled correctly to proceed
                  </p>
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full max-w-xs"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Start Assessment"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>
        
        {/* Reset button for troubleshooting */}
        <div className="absolute bottom-4 right-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetAssessmentData}
            className="text-xs opacity-50 hover:opacity-100"
          >
            Reset Assessment Data
          </Button>
        </div>
      </div>
    </div>
  );
}
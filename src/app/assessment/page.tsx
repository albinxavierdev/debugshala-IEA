"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, User, Mail, Phone, GraduationCap, Calendar, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { assessmentService } from '@/lib/assessment-service';
import { FormData } from '@/types/assessment';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

export default function AssessmentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    degree: '',
    graduationYear: '',
    collegeName: '',
    interestedDomains: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store form data in assessment service
      assessmentService.setFormData(formData);
      
      // Navigate to instructions page
      router.push('/assessment/instructions');
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
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

  const handleDomainChange = (domain: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        interestedDomains: [...prev.interestedDomains, domain]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        interestedDomains: prev.interestedDomains.filter(d => d !== domain)
      }));
    }
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
      fields: ["interestedDomains"]
    }
  ];

  // Calculate form completion percentage
  const calculateProgress = () => {
    const requiredFields = ["name", "email", "phone", "degree", "graduationYear", "collegeName"];
    const completedFields = requiredFields.filter(field => !!formData[field as keyof FormData]);
    const hasInterests = formData.interestedDomains.length > 0;
    
    return Math.round(((completedFields.length + (hasInterests ? 1 : 0)) / (requiredFields.length + 1)) * 100);
  };

  const progress = calculateProgress();

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
                        if (field === "interestedDomains") {
                          return (
                            <div key={field} className="md:col-span-2">
                              <Label className="font-medium mb-3 block">Interested Domains</Label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {domainOptions.map(domain => (
                                  <div key={domain.id} className="flex items-center space-x-2 hover:bg-muted/50 p-2 rounded-md transition-colors">
                                    <Checkbox 
                                      id={domain.id}
                                      checked={formData.interestedDomains.includes(domain.label)}
                                      onCheckedChange={(checked) => handleDomainChange(domain.label, !!checked)}
                                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                    <Label htmlFor={domain.id} className="cursor-pointer text-sm">{domain.label}</Label>
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
                            <Label htmlFor={field} className="font-medium mb-2 block">{
                              field === "graduationYear" ? "Year of Graduation" :
                              field === "collegeName" ? "College/University" :
                              field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                            }</Label>
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
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                ))}
                
                <div className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-full py-6 text-lg"
                    disabled={loading || progress < 50}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Continue to Assessment'
                    )}
                  </Button>
                  
                  {progress < 50 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Please complete more of your profile to continue
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, User, Mail, Phone, GraduationCap, Calendar, Building, Code } from 'lucide-react';
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
    interestedDomains: []
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
      fields: ["name", "email", "phone"]
    },
    {
      title: "Educational Background",
      fields: ["degree", "graduationYear", "collegeName"]
    },
    {
      title: "Technical Interests",
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
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/80 to-primary p-6 text-white">
            <h1 className="text-3xl font-bold">Assessment Registration</h1>
            <p className="mt-2 opacity-90">Complete the form below to start your personalized skill assessment</p>
          </div>

          {/* Progress bar */}
          <div className="px-6 pt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 pt-2">
            {formSections.map((section, idx) => (
              <motion.div 
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="mb-8"
              >
                <h2 className="text-xl font-semibold mb-4 text-primary/90 border-b pb-2">{section.title}</h2>
                
                <div className="space-y-4">
                  {section.fields.includes("name") && (
                    <div className="relative">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Full Name
                      </Label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  {section.fields.includes("email") && (
                    <div className="relative">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter your email address"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  {section.fields.includes("phone") && (
                    <div className="relative">
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone Number
                      </Label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          id="phone"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter your phone number"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  {section.fields.includes("degree") && (
                    <div className="relative">
                      <Label htmlFor="degree" className="text-sm font-medium">
                        Degree
                      </Label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <GraduationCap className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          id="degree"
                          required
                          value={formData.degree}
                          onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
                          placeholder="e.g. B.Tech Computer Science"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  {section.fields.includes("graduationYear") && (
                    <div className="relative">
                      <Label htmlFor="graduationYear" className="text-sm font-medium">
                        Graduation Year
                      </Label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          id="graduationYear"
                          type="number"
                          min="1990"
                          max="2030"
                          required
                          value={formData.graduationYear}
                          onChange={(e) => setFormData(prev => ({ ...prev, graduationYear: e.target.value }))}
                          placeholder="Enter your graduation year"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  {section.fields.includes("collegeName") && (
                    <div className="relative">
                      <Label htmlFor="collegeName" className="text-sm font-medium">
                        College Name
                      </Label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          id="collegeName"
                          required
                          value={formData.collegeName}
                          onChange={(e) => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
                          placeholder="e.g. IIT Delhi"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  {section.fields.includes("interestedDomains") && (
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <Code className="h-4 w-4 text-gray-500" />
                        <Label className="text-sm font-medium">Interested Domains</Label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border">
                        {domainOptions.map((domain) => (
                          <div key={domain.id} className="flex items-center space-x-2 hover:bg-white p-2 rounded-md transition-colors">
                            <Checkbox 
                              id={domain.id} 
                              checked={formData.interestedDomains.includes(domain.id)}
                              onCheckedChange={(checked) => 
                                handleDomainChange(domain.id, checked as boolean)
                              }
                              className="text-primary"
                            />
                            <label
                              htmlFor={domain.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                            >
                              {domain.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      {formData.interestedDomains.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">Please select at least one domain of interest</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-8"
            >
              <Button 
                type="submit" 
                className="w-full py-6 text-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md" 
                disabled={loading || formData.interestedDomains.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Start Your Assessment'
                )}
              </Button>
            </motion.div>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
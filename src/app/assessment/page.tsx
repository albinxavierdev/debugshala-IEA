"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { assessmentService } from '@/lib/assessment-service';
import { FormData } from '@/types/assessment';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">Assessment Registration</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <Label htmlFor="degree">Degree</Label>
              <Input
                id="degree"
                required
                value={formData.degree}
                onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
                placeholder="e.g. B.Tech Computer Science"
              />
            </div>

            <div>
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Input
                id="graduationYear"
                type="number"
                min="1990"
                max="2030"
                required
                value={formData.graduationYear}
                onChange={(e) => setFormData(prev => ({ ...prev, graduationYear: e.target.value }))}
                placeholder="Enter your graduation year"
              />
            </div>

            <div>
              <Label htmlFor="collegeName">College Name</Label>
              <Input
                id="collegeName"
                required
                value={formData.collegeName}
                onChange={(e) => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
                placeholder="e.g. IIT Delhi"
              />
            </div>

            <div>
              <Label className="mb-2 block">Interested Domains</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {domainOptions.map((domain) => (
                  <div key={domain.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={domain.id} 
                      checked={formData.interestedDomains.includes(domain.id)}
                      onCheckedChange={(checked) => 
                        handleDomainChange(domain.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={domain.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {domain.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Start Assessment'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
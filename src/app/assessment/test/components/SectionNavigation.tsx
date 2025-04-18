import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { Section } from '@/types/assessment';

interface SectionNavigationProps {
  sections: Section[];
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
}

/**
 * Component for displaying and navigating between assessment sections
 */
export function SectionNavigation({ 
  sections, 
  currentSectionIndex, 
  onSectionChange 
}: SectionNavigationProps) {
  return (
    <Card className="p-4">
      <h2 id="sections-heading" className="font-bold mb-4">Sections</h2>
      <ul 
        aria-labelledby="sections-heading" 
        className="space-y-3"
        role="tablist"
      >
        {sections.map((section, index) => (
          <li key={section.id}>
            <button
              role="tab"
              id={`section-tab-${section.id}`}
              aria-selected={index === currentSectionIndex}
              aria-controls={`section-content-${section.id}`}
              tabIndex={index === currentSectionIndex ? 0 : -1}
              className={`w-full p-3 rounded-lg flex gap-3 items-center ${
                index === currentSectionIndex 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : section.completed 
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-card hover:bg-muted/50 cursor-pointer'
              }`}
              onClick={() => {
                if (section.completed || index <= currentSectionIndex) {
                  onSectionChange(index);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (section.completed || index <= currentSectionIndex) {
                    onSectionChange(index);
                  }
                  e.preventDefault();
                }
              }}
            >
              {section.completed ? (
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <div className={`h-5 w-5 rounded-full flex-shrink-0 grid place-items-center text-xs font-medium ${
                  index === currentSectionIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate">{section.title}</div>
                <div className="text-xs text-muted-foreground">{section.duration} mins</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default SectionNavigation; 
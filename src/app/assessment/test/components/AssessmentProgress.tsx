import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface AssessmentProgressProps {
  progress: number;
  currentSectionIndex: number;
  totalSections: number;
  timeRemaining: string;
  userName?: string;
}

/**
 * Component for displaying assessment progress, timer, and user info
 */
export function AssessmentProgress({
  progress,
  currentSectionIndex,
  totalSections,
  timeRemaining,
  userName
}: AssessmentProgressProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employability Assessment</h1>
          <p className="text-muted-foreground">Welcome, {userName || 'Candidate'}</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 py-2 px-4 rounded-full">
          <Clock className="h-5 w-5 text-primary" />
          <div className="text-lg font-semibold text-primary">{timeRemaining}</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium">Progress</div>
          <div className="text-sm text-muted-foreground">
            Section {currentSectionIndex + 1} of {totalSections}
          </div>
        </div>
        <Progress 
          value={progress * 100} 
          className="h-2" 
          aria-label={`Assessment progress: ${Math.round(progress * 100)}%`}
        />
      </div>
    </div>
  );
}

export default AssessmentProgress; 
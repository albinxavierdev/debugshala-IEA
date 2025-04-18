import React from 'react';
import { Loader2, Sparkles, Brain, Code, Briefcase, DatabaseIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

type LoadingStage = 'initializing' | 'generating' | 'loading' | 'cached';

interface QuestionLoadingStateProps {
  loadingStage?: LoadingStage;
  progress?: number;
  sectionTitle?: string;
  interests?: string[];
  cacheSource?: 'memory' | 'file' | 'none';
}

const QuestionLoadingState: React.FC<QuestionLoadingStateProps> = ({
  sectionTitle = 'Assessment',
  interests = ['technology'],
  loadingStage = 'loading',
  progress = 0,
  cacheSource = 'none'
}) => {
  const titles: Record<LoadingStage, string> = {
    initializing: 'Setting up your assessment...',
    generating: `Generating personalized ${sectionTitle?.toLowerCase() || ''} questions...`,
    loading: 'Loading your assessment...',
    cached: `Loading cached ${sectionTitle?.toLowerCase() || ''} questions...`
  };

  const descriptions: Record<LoadingStage, string> = {
    initializing: 'We\'re preparing your assessment environment',
    generating: `Creating questions relevant to ${interests?.[0] || 'your interests'}`,
    loading: 'Getting everything ready for you',
    cached: 'Using saved questions for faster performance'
  };

  const isUsingCache = cacheSource !== 'none';
  const effectiveStage = isUsingCache ? 'cached' : loadingStage;
  
  // Randomly pick one of the user's interests if available
  const interest = interests && interests.length > 0 
    ? interests[Math.floor(Math.random() * interests.length)] 
    : 'your field of interest';
  
  // Personalized message
  const personalizedMessage = sectionTitle 
    ? `Creating personalized ${sectionTitle.toLowerCase()} questions related to ${interest}...`
    : descriptions[effectiveStage];
  
  // Get icon based on section type
  const getIconComponent = () => {
    if (isUsingCache) {
      return <DatabaseIcon className="h-10 w-10 text-primary animate-pulse" />;
    }
    
    if (effectiveStage === 'generating') {
      return <Sparkles className="h-10 w-10 text-primary animate-pulse" />;
    }
    
    if (sectionTitle) {
      const lowerTitle = sectionTitle.toLowerCase();
      if (lowerTitle.includes('aptitude')) {
        return <Brain className="h-10 w-10 text-primary" />;
      }
      if (lowerTitle.includes('programming')) {
        return <Code className="h-10 w-10 text-primary" />;
      }
      if (lowerTitle.includes('employability')) {
        return <Briefcase className="h-10 w-10 text-primary" />;
      }
    }
    
    return <Loader2 className="h-10 w-10 text-primary animate-spin" />;
  };
  
  return (
    <div className="w-full max-w-md">
      <div className="mx-auto">
        <div className="flex items-center justify-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {getIconComponent()}
          </motion.div>
        </div>
        
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl font-semibold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
        >
          {titles[effectiveStage]}
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted-foreground mb-6"
        >
          {personalizedMessage}
          {isUsingCache && (
            <span className="block mt-1 text-sm text-primary">
              {cacheSource === 'memory' ? 'From memory cache' : 'From saved file'}
            </span>
          )}
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-muted-foreground">
              {progress < 100 
                ? "Please wait a moment..." 
                : "Almost ready..."}
            </p>
            <p className="text-sm font-medium">{progress}%</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuestionLoadingState; 
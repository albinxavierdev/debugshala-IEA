import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface QuestionLoadingStateProps {
  sectionTitle?: string;
  interests?: string[];
}

/**
 * A component to display a loading state when questions are being generated
 * This ensures we don't show placeholder UI until questions are ready
 */
export function QuestionLoadingState({ sectionTitle = "assessment", interests = [] }: QuestionLoadingStateProps) {
  const interestsText = interests.length > 0 
    ? interests.join(', ') 
    : 'technology';

  return (
    <div className="py-12 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <h4 className="text-lg font-medium mb-2">Generating Questions</h4>
        <p className="text-muted-foreground mb-3">
          Creating personalized {sectionTitle} questions based on your interests in {interestsText}
        </p>
        <div className="max-w-xs mx-auto">
          <Progress value={75} className="h-1.5 mb-2" />
          <p className="text-xs text-muted-foreground">
            Analyzing your profile to craft relevant questions...
          </p>
        </div>
      </motion.div>
    </div>
  );
} 
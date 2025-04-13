import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/ui/navbar";

interface ErrorPageProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Standardized error page component to display errors consistently throughout the application
 */
export function ErrorPage({
  title = "An Error Occurred",
  message = "We encountered an unexpected error. Please try again later.",
  actionLabel = "Reload Page",
  onAction = () => window.location.reload()
}: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
} 
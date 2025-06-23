import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Clock, Search, CheckCircle, AlertCircle, Zap } from "lucide-react";

interface ResearchProgressProps {
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  currentQuery?: string;
  estimatedTimeRemaining?: number;
  isDeepMode: boolean;
  validationRound?: number;
  totalValidationRounds?: number;
}

export function ResearchProgress({ 
  currentStep, 
  totalSteps, 
  completedSteps, 
  currentQuery,
  estimatedTimeRemaining,
  isDeepMode,
  validationRound,
  totalValidationRounds
}: ResearchProgressProps) {
  const progressPercentage = (completedSteps / totalSteps) * 100;
  
  const getStepIcon = (step: string) => {
    switch (step.toLowerCase()) {
      case 'generating queries':
        return <Search className="h-4 w-4" />;
      case 'researching':
        return <Search className="h-4 w-4 animate-pulse" />;
      case 'validating':
        return <CheckCircle className="h-4 w-4" />;
      case 'cross-referencing':
        return <AlertCircle className="h-4 w-4" />;
      case 'finalizing':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      {isDeepMode && (
        <Alert variant="info">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Deep Research Mode Active - Performing comprehensive analysis
            {validationRound && totalValidationRounds && (
              <span className="ml-2 text-xs">
                (Validation round {validationRound}/{totalValidationRounds})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getStepIcon(currentStep)}
            <span className="font-medium">{currentStep}</span>
          </div>
          <span className="text-muted-foreground">
            {completedSteps}/{totalSteps} steps
          </span>
        </div>
        
        <Progress value={progressPercentage} className="h-2" />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(progressPercentage)}% complete</span>
          {estimatedTimeRemaining && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>~{formatTime(estimatedTimeRemaining)} remaining</span>
            </div>
          )}
        </div>
      </div>

      {currentQuery && (
        <div className="mt-3 p-3 bg-muted/50 rounded-md">
          <div className="text-xs text-muted-foreground mb-1">Current Query:</div>
          <div className="text-sm">{currentQuery}</div>
        </div>
      )}

      {isDeepMode && (
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
          <div className="space-y-1">
            <div className="font-medium">Deep Research Features:</div>
            <div className="text-muted-foreground">
              • Enhanced source validation<br/>
              • Cross-reference checking<br/>
              • Extended research loops
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Quality Assurance:</div>
            <div className="text-muted-foreground">
              • Fact verification<br/>
              • Source credibility analysis<br/>
              • Contradiction detection
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
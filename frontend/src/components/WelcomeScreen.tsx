import { InputForm } from "./InputForm";
import { SearchMode } from "./SearchModeSelector";
import { FlowSelector, FlowType } from "./FlowSelector";

interface WelcomeScreenProps {
  handleSubmit: (
    submittedInputValue: string,
    effort: string,
    model: string,
    searchMode: SearchMode,
    flowType?: FlowType
  ) => void;
  onCancel: () => void;
  isLoading: boolean;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  flowType: FlowType;
  setFlowType: (flow: FlowType) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  handleSubmit,
  onCancel,
  isLoading,
  searchMode,
  setSearchMode,
  flowType,
  setFlowType,
}) => (
  <div className="h-full flex flex-col items-center justify-center px-6 w-full max-w-4xl mx-auto">
    <div className="flex-1 flex flex-col justify-center items-center space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Intuition Machine Deep Research Tool
          </span>
        </h1>
      </div>
    </div>

    <div className="w-full max-w-4xl mb-8">
      <InputForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={onCancel}
        hasHistory={false}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        flowType={flowType}
        setFlowType={setFlowType}
      />
    </div>
    
    <div className="mb-16">
      <p className="text-xs text-muted-foreground text-center">
        Powered by Intuition Machine Quaternion Process Theory
      </p>
    </div>

  </div>
);

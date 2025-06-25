import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Calendar, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  importPrompts, 
  readFileAsText,
  type PromptPreset,
  type SingleFlowPreset,
  type AllPrompts 
} from '@/lib/promptUtils';

interface LoadPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (prompts: AllPrompts) => void;
  onImportSingleFlow: (flowType: 'default' | 'anthropic' | 'nosearch', prompts: any) => void;
}

export function LoadPromptsModal({ isOpen, onClose, onImport, onImportSingleFlow }: LoadPromptsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [preset, setPreset] = useState<PromptPreset | SingleFlowPreset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreset(null);

    try {
      const content = await readFileAsText(file);
      const importedPreset = importPrompts(content);
      setPreset(importedPreset);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preset) return;

    setIsImporting(true);
    try {
      // Check if it's a single flow preset
      if ('flow_type' in preset.metadata) {
        const singleFlowPreset = preset as SingleFlowPreset;
        onImportSingleFlow(singleFlowPreset.metadata.flow_type, singleFlowPreset.prompts);
      } else {
        // All flows preset
        const allFlowsPreset = preset as PromptPreset;
        onImport(allFlowsPreset.prompts);
      }
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import prompts';
      setError(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isImporting) {
      setPreset(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Count prompts in the preset
  const getPromptCounts = (preset: PromptPreset | SingleFlowPreset) => {
    if ('flow_type' in preset.metadata) {
      // Single flow preset
      const singlePreset = preset as SingleFlowPreset;
      const flowType = singlePreset.metadata.flow_type;
      
      if (flowType === 'default' && singlePreset.prompts.default_flow) {
        const count = Object.keys(singlePreset.prompts.default_flow).filter(key => 
          singlePreset.prompts.default_flow![key as keyof typeof singlePreset.prompts.default_flow] !== null
        ).length;
        return { defaultCount: count, anthropicCount: 0, noSearchCount: 0, total: count };
      } else if (flowType === 'anthropic' && singlePreset.prompts.anthropic_flow) {
        const count = Object.keys(singlePreset.prompts.anthropic_flow).length;
        return { defaultCount: 0, anthropicCount: count, noSearchCount: 0, total: count };
      } else if (flowType === 'nosearch' && singlePreset.prompts.no_search) {
        return { defaultCount: 0, anthropicCount: 0, noSearchCount: 1, total: 1 };
      }
      return { defaultCount: 0, anthropicCount: 0, noSearchCount: 0, total: 0 };
    } else {
      // All flows preset
      const allPreset = preset as PromptPreset;
      const defaultCount = Object.keys(allPreset.prompts.default_flow).filter(key => 
        allPreset.prompts.default_flow[key as keyof typeof allPreset.prompts.default_flow] !== null
      ).length;
      const anthropicCount = Object.keys(allPreset.prompts.anthropic_flow).length;
      const noSearchCount = 1; // always 1 for no_search

      return { defaultCount, anthropicCount, noSearchCount, total: defaultCount + anthropicCount + noSearchCount };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Prompt Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Load a previously exported prompt configuration from a JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Section */}
          {!preset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Select Configuration File</CardTitle>
                <CardDescription>Choose a JSON file exported from this application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={handleUploadClick}
                  >
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to select a JSON file or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Only .json files are supported
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Reading file...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Section */}
          {preset && (
            <>
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span>File Loaded Successfully</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-700" />
                      <span className="font-medium text-green-800">{preset.metadata.name}</span>
                    </div>
                    {preset.metadata.description && (
                      <p className="text-sm text-green-700">{preset.metadata.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-green-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(preset.metadata.created_at).toLocaleDateString()}</span>
                      </div>
                      {preset.metadata.author && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{preset.metadata.author}</span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        v{preset.metadata.version}
                      </Badge>
                    </div>
                  </div>

                  {/* Prompt Counts */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-800">Prompts to Import:</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const counts = getPromptCounts(preset);
                        return (
                          <>
                            <Badge variant="secondary">Default Flow ({counts.defaultCount})</Badge>
                            <Badge variant="secondary">Anthropic Flow ({counts.anthropicCount})</Badge>
                            <Badge variant="secondary">No Search ({counts.noSearchCount})</Badge>
                            <Badge variant="outline">Total: {counts.total}</Badge>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warning */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Importing will replace all current prompt configurations. Make sure to export your current 
                  settings if you want to keep them.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPreset(null);
                    setError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={isImporting}
                >
                  Choose Different File
                </Button>
                <div className="space-x-3">
                  <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={isImporting}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Import Prompts'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 
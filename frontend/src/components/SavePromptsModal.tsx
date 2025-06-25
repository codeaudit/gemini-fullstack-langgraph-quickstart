import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, User } from 'lucide-react';
import { 
  exportSingleFlow,
  downloadSingleFlowPreset,
  type DefaultFlowPrompts, 
  type AnthropicFlowPrompts,
  type PresetMetadata 
} from '@/lib/promptUtils';

interface SavePromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowPrompts: {
    default_flow: DefaultFlowPrompts;
    anthropic_flow: AnthropicFlowPrompts;
  };
  noSearchPrompt: string;
  activeTab: 'default' | 'anthropic' | 'nosearch';
}

export function SavePromptsModal({ isOpen, onClose, flowPrompts, noSearchPrompt, activeTab }: SavePromptsModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!name.trim()) {
      return;
    }

    setIsExporting(true);
    try {
      const metadata: Omit<PresetMetadata, 'created_at' | 'version'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        author: author.trim() || undefined
      };

      // Export only the current active flow
      const preset = exportSingleFlow(activeTab, flowPrompts, noSearchPrompt, metadata);
      downloadSingleFlowPreset(preset);
      
      // Reset form and close modal
      setName('');
      setDescription('');
      setAuthor('');
      onClose();
    } catch (error) {
      console.error('Failed to export prompts:', error);
      // TODO: Add proper error handling with toast notification
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setName('');
      setDescription('');
      setAuthor('');
      onClose();
    }
  };

  // Count prompts for current flow only
  const getCurrentFlowPromptCount = () => {
    switch (activeTab) {
      case 'default':
        return Object.keys(flowPrompts.default_flow).filter(key => 
          flowPrompts.default_flow[key as keyof DefaultFlowPrompts] !== null
        ).length;
      case 'anthropic':
        return Object.keys(flowPrompts.anthropic_flow).length;
      case 'nosearch':
        return 1;
      default:
        return 0;
    }
  };
  
  const totalPrompts = getCurrentFlowPromptCount();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Prompt Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Save your current prompt configuration as a downloadable JSON file for backup or sharing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Information Card */}
          <Card>
                      <CardHeader>
            <CardTitle className="text-sm">Export Summary</CardTitle>
            <CardDescription>This export will include prompts for the {
              activeTab === 'default' ? 'Default Flow' : 
              activeTab === 'anthropic' ? 'Anthropic Flow' : 
              'No Search'
            } tab</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{totalPrompts} prompts from {
                activeTab === 'default' ? 'Default Flow' : 
                activeTab === 'anthropic' ? 'Anthropic Flow' : 
                'No Search'
              }</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTab === 'default' && (
                <Badge variant="secondary">Default Flow ({totalPrompts})</Badge>
              )}
              {activeTab === 'anthropic' && (
                <Badge variant="secondary">Anthropic Flow ({totalPrompts})</Badge>
              )}
              {activeTab === 'nosearch' && (
                <Badge variant="secondary">No Search ({totalPrompts})</Badge>
              )}
            </div>
          </CardContent>
          </Card>

          {/* Metadata Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="preset-name" className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="preset-name"
                placeholder="e.g., Technical Research Prompts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isExporting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="preset-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="preset-description"
                placeholder="Optional description of this prompt configuration..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isExporting}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="preset-author" className="text-sm font-medium">
                Author
              </label>
              <Input
                id="preset-author"
                placeholder="Your name (optional)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={isExporting}
              />
            </div>
          </div>

          {/* Export Preview */}
          {name && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Export Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{name}</span>
                </div>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  {author && (
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{author}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={!name.trim() || isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Prompts'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
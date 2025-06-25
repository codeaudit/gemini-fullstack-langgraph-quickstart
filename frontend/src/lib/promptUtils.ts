// Prompt save/load utility functions

export interface PresetMetadata {
  name: string;
  description?: string;
  version: string;
  created_at: string;
  modified_at?: string;
  author?: string;
}

export interface DefaultFlowPrompts {
  route_search_mode?: string | null;
  direct_llm_response?: string | null;
  generate_query: string;
  web_research: string;
  reflection: string;
  validate_sources?: string | null;
  finalize_answer: string;
}

export interface AnthropicFlowPrompts {
  lead_agent_orchestrator: string;
  search_subagent: string;
  citations_subagent: string;
  finalize_multi_agent_report: string;
}

export interface NoSearchPrompts {
  direct_prompt_template: string;
}

export interface AllPrompts {
  default_flow: DefaultFlowPrompts;
  anthropic_flow: AnthropicFlowPrompts;
  no_search: NoSearchPrompts;
}

export interface SingleFlowPrompts {
  default_flow?: DefaultFlowPrompts;
  anthropic_flow?: AnthropicFlowPrompts;
  no_search?: NoSearchPrompts;
}

export interface PromptPreset {
  metadata: PresetMetadata;
  prompts: AllPrompts;
}

export interface SingleFlowPreset {
  metadata: PresetMetadata & { flow_type: 'default' | 'anthropic' | 'nosearch' };
  prompts: SingleFlowPrompts;
}

/**
 * Export current prompts to a downloadable JSON structure (all flows)
 */
export function exportPrompts(
  flowPrompts: { default_flow: DefaultFlowPrompts; anthropic_flow: AnthropicFlowPrompts },
  noSearchPrompt: string,
  metadata: Omit<PresetMetadata, 'created_at' | 'version'>
): PromptPreset {
  const preset: PromptPreset = {
    metadata: {
      ...metadata,
      version: "1.0",
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
    },
    prompts: {
      default_flow: flowPrompts.default_flow,
      anthropic_flow: flowPrompts.anthropic_flow,
      no_search: {
        direct_prompt_template: noSearchPrompt
      }
    }
  };

  return preset;
}

/**
 * Export single flow prompts to a downloadable JSON structure
 */
export function exportSingleFlow(
  flowType: 'default' | 'anthropic' | 'nosearch',
  flowPrompts: { default_flow: DefaultFlowPrompts; anthropic_flow: AnthropicFlowPrompts },
  noSearchPrompt: string,
  metadata: Omit<PresetMetadata, 'created_at' | 'version'>
): SingleFlowPreset {
  const baseMetadata = {
    ...metadata,
    version: "1.0",
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    flow_type: flowType
  };

  let prompts: SingleFlowPrompts = {};

  switch (flowType) {
    case 'default':
      prompts.default_flow = flowPrompts.default_flow;
      break;
    case 'anthropic':
      prompts.anthropic_flow = flowPrompts.anthropic_flow;
      break;
    case 'nosearch':
      prompts.no_search = {
        direct_prompt_template: noSearchPrompt
      };
      break;
  }

  return {
    metadata: baseMetadata,
    prompts
  };
}

/**
 * Import prompts from a JSON string (supports both all-flow and single-flow formats)
 */
export function importPrompts(jsonString: string): PromptPreset | SingleFlowPreset {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Check if it's a single flow format
    if (parsed.metadata?.flow_type) {
      if (!validateSingleFlowFile(parsed)) {
        throw new Error("Invalid single flow prompt file structure");
      }
      return parsed as SingleFlowPreset;
    } else {
      // Original all-flow format
      if (!validatePromptFile(parsed)) {
        throw new Error("Invalid prompt file structure");
      }
      return parsed as PromptPreset;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format");
    }
    throw error;
  }
}

/**
 * Validate that a parsed object matches the expected SingleFlowPreset structure
 */
export function validateSingleFlowFile(obj: any): obj is SingleFlowPreset {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check metadata
  if (!obj.metadata || typeof obj.metadata !== 'object') {
    return false;
  }

  const { metadata } = obj;
  if (!metadata.name || typeof metadata.name !== 'string') {
    return false;
  }

  if (!metadata.version || typeof metadata.version !== 'string') {
    return false;
  }

  if (!metadata.created_at || typeof metadata.created_at !== 'string') {
    return false;
  }

  if (!metadata.flow_type || !['default', 'anthropic', 'nosearch'].includes(metadata.flow_type)) {
    return false;
  }

  // Check prompts structure
  if (!obj.prompts || typeof obj.prompts !== 'object') {
    return false;
  }

  const { prompts } = obj;
  const flowType = metadata.flow_type;

  // Validate based on flow type
  switch (flowType) {
    case 'default':
      if (!prompts.default_flow || typeof prompts.default_flow !== 'object') {
        return false;
      }
      const requiredDefaultFields = ['generate_query', 'web_research', 'reflection', 'finalize_answer'];
      for (const field of requiredDefaultFields) {
        if (!prompts.default_flow[field] || typeof prompts.default_flow[field] !== 'string') {
          return false;
        }
      }
      break;

    case 'anthropic':
      if (!prompts.anthropic_flow || typeof prompts.anthropic_flow !== 'object') {
        return false;
      }
      const requiredAnthropicFields = [
        'lead_agent_orchestrator', 
        'search_subagent', 
        'citations_subagent', 
        'finalize_multi_agent_report'
      ];
      for (const field of requiredAnthropicFields) {
        if (!prompts.anthropic_flow[field] || typeof prompts.anthropic_flow[field] !== 'string') {
          return false;
        }
      }
      break;

    case 'nosearch':
      if (!prompts.no_search || typeof prompts.no_search !== 'object') {
        return false;
      }
      if (!prompts.no_search.direct_prompt_template || typeof prompts.no_search.direct_prompt_template !== 'string') {
        return false;
      }
      break;

    default:
      return false;
  }

  return true;
}

/**
 * Validate that a parsed object matches the expected PromptPreset structure
 */
export function validatePromptFile(obj: any): obj is PromptPreset {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check metadata
  if (!obj.metadata || typeof obj.metadata !== 'object') {
    return false;
  }

  const { metadata } = obj;
  if (!metadata.name || typeof metadata.name !== 'string') {
    return false;
  }

  if (!metadata.version || typeof metadata.version !== 'string') {
    return false;
  }

  if (!metadata.created_at || typeof metadata.created_at !== 'string') {
    return false;
  }

  // Check prompts structure
  if (!obj.prompts || typeof obj.prompts !== 'object') {
    return false;
  }

  const { prompts } = obj;

  // Validate default_flow
  if (!prompts.default_flow || typeof prompts.default_flow !== 'object') {
    return false;
  }

  const requiredDefaultFields = ['generate_query', 'web_research', 'reflection', 'finalize_answer'];
  for (const field of requiredDefaultFields) {
    if (!prompts.default_flow[field] || typeof prompts.default_flow[field] !== 'string') {
      return false;
    }
  }

  // Validate anthropic_flow
  if (!prompts.anthropic_flow || typeof prompts.anthropic_flow !== 'object') {
    return false;
  }

  const requiredAnthropicFields = [
    'lead_agent_orchestrator', 
    'search_subagent', 
    'citations_subagent', 
    'finalize_multi_agent_report'
  ];
  for (const field of requiredAnthropicFields) {
    if (!prompts.anthropic_flow[field] || typeof prompts.anthropic_flow[field] !== 'string') {
      return false;
    }
  }

  // Validate no_search
  if (!prompts.no_search || typeof prompts.no_search !== 'object') {
    return false;
  }

  if (!prompts.no_search.direct_prompt_template || typeof prompts.no_search.direct_prompt_template !== 'string') {
    return false;
  }

  return true;
}

/**
 * Generate a descriptive filename for exported prompts
 */
export function generateFileName(name: string, flowType?: string): string {
  // Sanitize the name for filename use
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const timestamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/:/g, '')
    .replace('T', '-');

  const flowSuffix = flowType ? `-${flowType}-flow` : '';
  return `research-prompts-${sanitizedName}${flowSuffix}-${timestamp}.json`;
}

/**
 * Download a PromptPreset as a JSON file
 */
export function downloadPreset(preset: PromptPreset): void {
  const jsonString = JSON.stringify(preset, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const filename = generateFileName(preset.metadata.name);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Download a SingleFlowPreset as a JSON file
 */
export function downloadSingleFlowPreset(preset: SingleFlowPreset): void {
  const jsonString = JSON.stringify(preset, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const filename = generateFileName(preset.metadata.name, preset.metadata.flow_type);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Read and parse a file upload
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
} 
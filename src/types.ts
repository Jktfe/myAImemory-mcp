/**
 * Types for the memory template
 */

// Memory template structure
export interface MemoryTemplate {
  sections: TemplateSection[];
}

export interface TemplateSection {
  title: string;
  description: string;
  items: TemplateItem[];
}

export interface TemplateItem {
  key: string;
  value: string;
}

// Platform synchronization
export type PlatformType = 'claude-web' | 'claude-code' | 'windsurf' | 'master';

export interface SyncStatus {
  platform: PlatformType;
  success: boolean;
  message: string;
}

// Preset configuration
export interface Preset {
  name: string;
  sections: TemplateSection[];
}

// MCP types
export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export interface ResourceContent {
  type: "resource";
  resource: {
    text: string;
    uri: string;
    mimeType?: string;
  };
}

export type ContentType = TextContent | ImageContent | ResourceContent;

export interface ToolResponse {
  content: ContentType[];
  isError?: boolean;
}
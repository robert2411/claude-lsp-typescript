import type { IpcOp } from "../daemon/protocol.ts";

interface ToolDef {
  name: string;
  description: string;
  op: IpcOp;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const TOOLS: ToolDef[] = [
  {
    name: "typescript_diagnostics",
    op: "diagnostics",
    description: "Get TypeScript compiler and type diagnostics for a file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the .ts/.tsx file" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "typescript_hover",
    op: "hover",
    description: "Get hover information (JSDoc, type signature) for a symbol at a position.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the .ts/.tsx file" },
        line: { type: "number", description: "0-based line number" },
        character: { type: "number", description: "0-based character offset" },
      },
      required: ["file_path", "line", "character"],
    },
  },
  {
    name: "typescript_definition",
    op: "definition",
    description: "Go to the definition of a symbol (type, function, variable) at a position.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the .ts/.tsx file" },
        line: { type: "number", description: "0-based line number" },
        character: { type: "number", description: "0-based character offset" },
      },
      required: ["file_path", "line", "character"],
    },
  },
  {
    name: "typescript_references",
    op: "references",
    description: "Find all references to a symbol at a position across the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the .ts/.tsx file" },
        line: { type: "number", description: "0-based line number" },
        character: { type: "number", description: "0-based character offset" },
        include_declaration: { type: "boolean", description: "Include the declaration itself" },
      },
      required: ["file_path", "line", "character"],
    },
  },
  {
    name: "typescript_completion",
    op: "completion",
    description: "Get code completion suggestions at a position (up to 100 items).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the .ts/.tsx file" },
        line: { type: "number", description: "0-based line number" },
        character: { type: "number", description: "0-based character offset" },
      },
      required: ["file_path", "line", "character"],
    },
  },
  {
    name: "typescript_document_symbols",
    op: "documentSymbols",
    description: "List all symbols (classes, functions, interfaces) in a TypeScript file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the .ts/.tsx file" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "typescript_workspace_symbols",
    op: "workspaceSymbols",
    description: "Search for symbols across the entire TypeScript workspace by name query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Symbol name search query (can be partial)" },
        file_path: { type: "string", description: "Optional: a file to anchor the workspace root" },
      },
      required: ["query"],
    },
  },
  {
    name: "typescript_rename",
    op: "rename",
    description: "Compute rename edits for a symbol. Returns changes to apply — does NOT modify files. Apply with the Edit tool.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the .ts/.tsx file" },
        line: { type: "number", description: "0-based line number" },
        character: { type: "number", description: "0-based character offset" },
        new_name: { type: "string", description: "New name for the symbol" },
      },
      required: ["file_path", "line", "character", "new_name"],
    },
  },
];

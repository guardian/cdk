export interface SynthedStack {
  Parameters: Record<string, { Properties: Record<string, unknown> }>;
  Mappings: Record<string, unknown>;
  Resources: Record<string, { Properties: Record<string, unknown> }>;
}

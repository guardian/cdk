export interface SynthedStack {
  Parameters: Record<string, { Properties: Record<string, unknown> }>;
  Resources: Record<string, { Properties: Record<string, unknown> }>;
}

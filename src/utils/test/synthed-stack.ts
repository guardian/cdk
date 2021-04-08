import type { Stage } from "../../constants";

interface Parameter {
  Type: string;
  Description: string;
  Default?: string | number;
  AllowedValues?: Array<string | number>;
}

type ResourceProperty = Record<string, unknown>;
type Resource = Record<string, { Type: string; Properties: ResourceProperty }>;

export interface SynthedStack {
  Parameters: Record<string, Parameter>;
  Mappings: Record<Stage, unknown>;
  Resources: Resource;
}

import type { GetParameterRequest } from "aws-sdk/clients/ssm";

export interface CustomResourceGetParameterProps {
  apiRequest: GetParameterRequest;
}

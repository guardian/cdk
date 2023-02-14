export interface AmigoProps {
  /**
   * The name of the AMIgo recipe.
   */
  Recipe: string;

  /**
   * Whether the AMI has been baked with encryption.
   * @default true
   */
  Encrypted?: boolean;

  /**
   * The AMIgo stage that baked the AMI.
   * @default PROD
   */
  AmigoStage?: string;
}

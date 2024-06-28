import type { CfnImageRecipeProps } from "aws-cdk-lib/aws-imagebuilder";
import { CfnImageRecipe } from "aws-cdk-lib/aws-imagebuilder";
import type { GuStack } from "../core";
import type { GuComponent } from "./component";

export type GuRecipeComponentConfiguration =
  | CfnImageRecipe.ComponentConfigurationProperty
  | GuComponent
  | ((scope: GuStack) => GuComponentConfigurationProperty);

export type GuComponentConfigurationProperty = Omit<CfnImageRecipe.ComponentConfigurationProperty, "componentArn"> & {
  component: GuComponent;
};

type GuImageRecipeProps = Omit<CfnImageRecipeProps, "components" | "version" | "name" | "parentImage"> & {
  /**
   * The name of the recipe. If not provided, a name will be generated.
   */
  name?: string;

  /**
   * The version of the recipe. Defaults to "1.0.0".
   */
  version?: string;

  /**
   * The parent image of the recipe. Defaults to Amazon Linux 2023 ARM if not provided.
   */
  parentImage?: string;

  /**
   * The components to include in the recipe.
   */
  components: GuRecipeComponentConfiguration[];
};

const isComponentConfigurationProperty = (obj: unknown): obj is CfnImageRecipe.ComponentConfigurationProperty =>
  typeof obj === "object" && obj !== null && "componentArn" in obj;

const isGuComponentConfigurationProperty = (obj: unknown): obj is GuComponentConfigurationProperty =>
  typeof obj === "object" && obj !== null && "component" in obj;

const isFunction = (obj: unknown): obj is (stack: GuStack) => GuComponentConfigurationProperty =>
  typeof obj === "function";

export class GuImageRecipe extends CfnImageRecipe {
  constructor(scope: GuStack, id: string, props: GuImageRecipeProps) {
    const name = props.name ?? `${scope.stack}-${scope.stage}-${scope.app ?? "unknown"}`;

    const components = [
      // Support inbuilt amazon components
      ...props.components.filter(isComponentConfigurationProperty),
      // Support custom Guardian components
      ...props.components.filter(isGuComponentConfigurationProperty).map((component) => ({
        ...component,
        componentArn: component.component.attrArn,
      })),
      // Support inbuilt custom GuCDK components
      ...props.components
        .filter(isFunction)
        .map((func) => func(scope))
        .map((component) => ({
          ...component,
          componentArn: component.component.attrArn,
        })),
    ];

    if (components.length === 0) {
      throw new Error("ImageBuilder expects recipes to have atleast 1 component.");
    }

    super(scope, id, {
      ...props,
      parentImage: props.parentImage ?? "arn:aws:imagebuilder:eu-west-1:aws:image/ubuntu-server-22-lts-arm64/x.x.x",
      name,
      version: props.version ?? "1.0.0",
      components,
    });
  }
}

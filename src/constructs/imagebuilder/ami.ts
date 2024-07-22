import type { GuStack } from "../core";
import { GuImagePipeline } from "./pipeline";
import { GuImageRecipe, type GuRecipeComponentConfiguration } from "./recipe";

export class Ami {
  private scope: GuStack;
  private id: string;

  private parentImage?: string;
  private components: GuRecipeComponentConfiguration[] = [];

  // eslint-disable-next-line custom-rules/valid-constructors -- not a valid
  constructor(scope: GuStack, id: string) {
    this.scope = scope;
    this.id = id;
  }

  public static from(scope: GuStack, id: string): Ami {
    return new Ami(scope, id);
  }

  public withParentImage(parentImage: string): this {
    this.parentImage = parentImage;
    return this;
  }

  public withComponent(component: GuRecipeComponentConfiguration): this {
    this.components.push(component);
    return this;
  }

  public build(): GuImagePipeline {
    const recipe = new GuImageRecipe(this.scope, `${this.id}Recipe`, {
      parentImage: this.parentImage,
      components: this.components,
    });

    return new GuImagePipeline(this.scope, this.id, {
      imageRecipe: recipe,
    });
  }
}

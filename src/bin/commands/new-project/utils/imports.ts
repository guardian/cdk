import type { CodeMaker } from "codemaker";
import type { PackageManager } from "..";
import type { Name } from "./utils";

interface Import {
  types: string[];
  components: string[];
  basic?: boolean;
}

export class Imports {
  private readonly imports: Record<string, Import>;

  private constructor(imports: Record<string, Import>) {
    this.imports = imports;
  }

  public static newStackImports(addCfnIncludeImports: boolean): Imports {
    return new Imports({
      ...(addCfnIncludeImports && {
        path: {
          types: [],
          components: ["join"],
        },
        "aws-cdk-lib/cloudformation-include": {
          types: [],
          components: ["CfnInclude"],
        },
      }),
      "aws-cdk-lib": {
        types: ["App"],
        components: [],
      },
      "@guardian/cdk/lib/constructs/core": {
        types: ["GuStackProps"],
        components: ["GuStack"],
      },
    });
  }

  public static newAppImports({
    name: { kebab, pascal },
    packageManager,
  }: {
    name: Name;
    packageManager: PackageManager;
  }): Imports {
    // Deno requires local imports to specify file extensions
    // https://docs.deno.com/runtime/fundamentals/modules
    const fileExtension = packageManager === "deno" ? ".ts" : "";
    return new Imports({
      "source-map-support/register": {
        basic: true,
        types: [],
        components: [],
      },
      "@guardian/cdk/lib/constructs/root": {
        types: [],
        components: ["GuRoot"],
      },
      [`../lib/${kebab}${fileExtension}`]: {
        types: [],
        components: [pascal],
      },
    });
  }

  public static newTestImports({
    name: { kebab, pascal },
    packageManager,
  }: {
    name: Name;
    packageManager: PackageManager;
  }): Imports {
    // Deno requires local imports to specify file extensions
    // https://docs.deno.com/runtime/fundamentals/modules
    const fileExtension = packageManager === "deno" ? ".ts" : "";
    return new Imports({
      "aws-cdk-lib": {
        types: [],
        components: ["App"],
      },
      "aws-cdk-lib/assertions": {
        types: [],
        components: ["Template"],
      },
      [`./${kebab}${fileExtension}`]: {
        types: [],
        components: [pascal],
      },
      ...(packageManager === "deno"
        ? {
            "@std/testing/snapshot": {
              types: [],
              components: ["assertSnapshot"],
            },
          }
        : {}),
    });
  }

  render(code: CodeMaker): void {
    Object.entries(this.imports)
      // Render "basic" imports before any others, still in alphabetical order
      // Render relative imports after absolute imports
      .sort(([aKey, aImports], [bKey, bImports]) => {
        if (aImports.basic && !bImports.basic) {
          return -1;
        } else if (bImports.basic && !aImports.basic) {
          return 1;
        } else if (aKey.startsWith(".") && !bKey.startsWith(".")) {
          return 1;
        } else if (bKey.startsWith(".") && !aKey.startsWith(".")) {
          return -1;
        } else {
          return aKey.localeCompare(bKey);
        }
      })
      .forEach(([lib, imports]) => {
        imports.basic && code.line(`import "${lib}";`);

        imports.types.length && code.line(`import type { ${imports.types.sort().join(", ")} } from "${lib}";`);

        imports.components.length && code.line(`import { ${imports.components.sort().join(", ")} } from "${lib}";`);
      });
    code.line();
  }
}

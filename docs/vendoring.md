# Iterate Quickly by Vendoring `cdk`

> [!TIP]
> Copy this section into a `.github/skills/vendoring/SKILL.md` with a header like:
```markdown
---
name: cdk-vendoring
description: Guide for vendoring the Guardian cdk library into a project.
---
```

To iterate quickly and test changes to `cdk` library, it can be copied into client projects (aka vendoring) to skip publishing a new version or canary.

## Add Git Submodule
In the client specific cdk project folder, we need to add the `cdk` library as a [[Git Submodule][git-scm.com/book/en/v2/Git-Tools-Submodules]].
```bash
# Change directory to the project specific cdk directory
cd cdk

# Add cdk as a submodule
# Optionally we can use `-b <branch>` to set up the submodule to track a feature branch automatically
mkdir vendor/
git submodule add -b <branch> https://github.com/guardian/cdk.git vendor/guardian-cdk
```

## Update `package.json`
Update package.json in the client `cdk` project to use the vendored version.
Here is an example diff:
```diff
modified cdk/package.json
@@ -18,7 +18,7 @@
 	"devDependencies": {
 		"@aws-sdk/client-auto-scaling": "3.1141.0",
 		"@aws-sdk/credential-providers": "3.1127.0",
-		"@guardian/cdk": "64.7.0",
+		"@guardian/cdk": "file:./vendor/guardian-cdk",
 		"@guardian/eslint-config": "16.0.0",
 		"@guardian/prettier": "11.0.0",
 		"@types/aws-lambda": "8.10.163",
```

## Npm install
It is important to run npm install in the vendored cdk project first, so that it is ready to go to be imported into the parent project.
```bash
cd ./vendor/guardian-cdk
npm ci

cd ../../
npm ci

# Should now be good to go!
npm test
```

## Setting up for using with CI
Make sure the github action knows to checkout submodules aswell.
Example diff:
```diff
modified .github/workflows/ci.yaml
@@ -63,6 +63,8 @@ jobs:
     steps:
       # Checkout the branch
       - uses: actions/checkout@v7.0.1
+        with:
+          submodules: recursive
```

Make sure it sets up the vendored cdk project (before setting up parent project cdk):
```diff
@@ -73,6 +75,9 @@ jobs:

       - uses: guardian/setup-scala@v2

+      - run: npm ci
+        working-directory: cdk/vendor/guardian-cdk
+
       - run: npm ci
         working-directory: cdk
```



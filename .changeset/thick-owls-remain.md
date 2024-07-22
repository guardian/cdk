---
"@guardian/cdk": major
---

GuCDK EC2 patterns now require an explicit `UserData` or `GuUserDataProps` input, instead of a string.

The UserData class comes with helpers that allow us to mutate the user data in our patterns which will be helpful with some of our upcoming work.
Unfortunately whenever a `string` is passed to our patterns we have to wrap it in a special `CustomUserData` class which disables most of these helpers.

For applications that were already using `GuUserDataProps` no change is required, however applications that used strings will have to make a small change.

```js
new GuEc2App({
  userData: `#!/usr/bin/bash echo "hello world"`,
  ...
})
```

becomes

```js
const userData = UserData.forLinux();
userData.addCommands(`echo "hello world"`);

new GuEc2App({
  userData,
  ...
})
```

Note that you no longer need to specify a shebang, by default `UserData` adds one for you. If you need to customize this behaviour you can look at the props accepted by `forLinux`.
You may also want to look at some of the other methods that UserData has to understand if it may be able to help you in other ways, for example `addS3DownloadCommand` the method helps you write commands to download from S3.

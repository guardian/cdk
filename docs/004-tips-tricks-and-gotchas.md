# Tips, Tracks and Gotchas

## Parameter Store

Values from parameter store can either be included via parameters or resolved directly.

When using via parameters, set the type value to be `AWS::SSM::Parameter::Value<TYPE>` where TYPE is type of the value itself. You can then provide a path to the value. This can be any supported parameter type.

To resolve a parameter within your CDK code you can use one of the [methods provided](https://docs.aws.amazon.com/cdk/latest/guide/get_ssm_value.html). Note that a version number can be provided for all values and for secret values it must be provided.

## Profile

You may need to set the profile value in the `cdk.json` file to a value which does not exist (e.g. `does-not-exist`).
This is a workaround to a known
[issue](https://github.com/aws/aws-cdk/issues/7849) where expired credentials
cause an error when running the `cdk synth` command. As we don't (yet) use any
features which require connecting to an account this does not break anything but
in the future we may actually require valid credentials to generate the
cloudformation.

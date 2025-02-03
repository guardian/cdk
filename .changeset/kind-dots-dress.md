---
"@guardian/cdk": major
---

## Reimplement reference to a pre-existing VPC
This version reimplements how GuCDK references a pre-existing VPC. The changes should improve in two areas:
1. Provide more stability by reducing the number of scenarios where the following error is thrown during synth:

   ```
   > Found an encoded list token string in a scalar string context. Use 'Fn.select(0, list)' (not 'list[0]') to extract elements from token lists.
   ```

2. Reduce the need to add values to `cdk.context.json`

For most applications, these changes will be minimal changing only the name of CloudFormation (CFN) parameters.

### CloudFormation Parameter changes
Previously, the CFN parameters were prefixed with the `app` being deployed.
For example, with an `app` called `api`, GuCDK added the following CFN parameters:
- `apiPrivateSubnets` - referencing an SSM Parameter holding the private subnets
- `apiPublicSubnets` - referencing an SSM Parameter holding the public subnets

The VPC of these subnets were referred to by the CFN parameter:
- `VpcId`

Now, the parameters are named:
- `VpcId`
- `VpcPrivateSubnets`
- `VpcPublicSubnets`

That is, the prefix is removed from the subnet parameters.
The aim is to make the relation between the parameters more explicit and easier to understand.
Additionally, prefixing the parameters with the `app` name was unnecessary and could lead to confusion and duplication.

#### `GuSubnetListParameter` is replaced with `GuVpcPrivateSubnetsParameter` and `GuVpcPublicSubnetsParameter`
The `GuSubnetListParameter` class has been replaced with `GuVpcPrivateSubnetsParameter` and `GuVpcPublicSubnetsParameter`.
The aim is to be more intention revealing and improve clarity.

They are now also implemented as singletons, similar to `GuVpcParameter`.

If you were previously overriding the default value of the VPC parameters, you'll need to reimplement this.
Here is the updated implementation:

```typescript
const vpcId = GuVpcParameter.getInstance(this);
const privateSubnets = GuVpcPrivateSubnetsParameter.getInstance(this);
const publicSubnets = GuVpcPublicSubnetsParameter.getInstance(this);

// Override the `/account/vpc/primary/id` default
vpcIdParameter.default = "/account/vpc/alternative-vpc/id";

// Override the `/account/vpc/primary/subnets/private` default
privateSubnets.default = "/account/vpc/alternative-vpc/subnets/private";

// Override the `/account/vpc/primary/subnets/public` default
publicSubnets.default = "/account/vpc/alternative-vpc/subnets/public";
```

### `GuEc2App` changes
The `privateSubnets` and `publicSubnets` properties have been removed from `GuEc2App` in favour of reading these values directly from the `vpc` prop.
This is to reinforce the relation between VPC and subnets.

```typescript
const { privateSubnets, publicSubnets } = props.vpc;
```

An error now will be thrown if these values are unset on the provided `vpc`.

### `GuVpc` is replaced with `GuVpcImport`
The `GuVpc` class at `@guardian/cdk/lib/constructs/ec2` has been replaced with `GuVpcImport` at `@guardian/cdk/lib/constructs/vpc`.
This naming is more intuitive and helps distinguish it from the other `GuVpc` construct that creates a new account VPC.

Typically, you shouldn't need to call `GuVpcImport` as GuCDK uses it internally by default.
Below are the migration paths for the most common use cases.

#### Migrating `GuVpc.fromIdParameter`
Before:

```typescript
import { GuVpc } from '@guardian/cdk/lib/constructs/ec2';

const vpc = GuVpc.fromIdParameter(this, 'vpc', { } );
```

After:

```typescript
import { GuVpcImport } from '@guardian/cdk/lib/constructs/vpc';

const vpc = GuVpcImport.fromSsmParameters(this);
```

#### Migrating `GuVpc.subnetsFromParameter`
Before:

```typescript
import { GuVpc, SubnetType } from '@guardian/cdk/lib/constructs/ec2';

const privateSubnets = GuVpc.subnetsFromParameter(this, {
  type: SubnetType.PRIVATE,
});

const publicSubnets = GuVpc.subnetsFromParameter(this, {
  type: SubnetType.PUBLIC,
});
```

After:

```typescript
import { GuVpcImport } from '@guardian/cdk/lib/constructs/vpc';

const vpc = GuVpcImport.fromSsmParameters(this);
const { privateSubnets, publicSubnets } = vpc;
```

#### Migrating `GuVpc.subnetsFromParameterFixedNumber`
Before:

```typescript
import { GuVpc } from '@guardian/cdk/lib/constructs/ec2';

const vpc = GuVpc.subnetsFromParameterFixedNumber(this, 'vpc', { } );
```

After:

```typescript
import { GuVpcImport } from '@guardian/cdk/lib/constructs/vpc';

const vpc = GuVpcImport.fromSsmParametersRegional(this);
```

---
"@guardian/cdk": major
---

This change includes some potentially breaking changes for consumers of:
- [`GuEc2App`](https://guardian.github.io/cdk/classes/patterns.GuEc2App.html)
- [`GuPlayApp`](https://guardian.github.io/cdk/classes/patterns.GuPlayApp.html) (a subclass of `GuEc2App`)
- [`GuPlayWorkerApp`](https://guardian.github.io/cdk/classes/patterns.GuPlayWorkerApp.html) (a subclass of `GuEc2App`)
- [`GuNodeApp`](https://guardian.github.io/cdk/classes/patterns.GuNodeApp.html) (a subclass of `GuEc2App`)

Since [v49.0.2](https://github.com/guardian/cdk/releases/tag/v49.0.2),
the EC2 instance profile created in `GuEc2App`, and it's subclasses,
used the [`AmazonSSMManagedInstanceCore`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html) AWS Managed Policy
to enable the [SSM+SSH capability](https://github.com/guardian/ssm-scala?tab=readme-ov-file#in-aws).

In addition to enabling SSM+SSH, this Managed Policy also provided read access to all SSM Parameters.
This is not least privilege.

In this version, usage of the `AmazonSSMManagedInstanceCore` Managed Policy is swapped for a custom,
more minimal, policy.

> [!IMPORTANT]
> Before upgrading to this version,
> ensure your application is not relying on the IAM Policy behaviour provided by `AmazonSSMManagedInstanceCore`.

If your application is reading SSM Parameters outside the `/STAGE/STACK/APP/*` namespace,
you will need to add an explicit policy.

An IAM Policy to read SSM Parameters in the `/STAGE/STACK/APP/*` namespace is already provided by the `GuEc2App` construct,
via [`GuParameterStoreReadPolicy`](https://guardian.github.io/cdk/classes/constructs_iam.GuParameterStoreReadPolicy.html)

To understand if your application is impacted,
consult [this Service Catalogue query](https://metrics.gutools.co.uk/goto/KZhWJVoIg?orgId=1)
showing CloudFormation stacks using the above _and_ using GuCDK v49.0.2 or above.

<details><summary>Query ran in Service Catalogue</summary>
<p>

```sql
with data as (
    select cfn.account_id
         , acc.name as account_name
         , tml.stack_id
         , cfn.last_updated_time
         , cfn.region
         , cfn.stack_name
         , tml.metadata ->> 'gu:cdk:version' as gucdk_version
         , cfn.tags ->> 'gu:repo' as repository
         , cfn.tags ->> 'Stack' as stack
         , cfn.tags ->> 'Stage' as stage
         , cfn.tags ->> 'App' as app
    from    aws_cloudformation_template_summaries tml
            join aws_accounts acc on tml.account_id = acc.id
            join aws_cloudformation_stacks cfn on tml.stack_arn = cfn.arn
    where   tml.metadata is not null
      and (
        (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuEc2App'
            OR (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuPlayApp'
            OR (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuPlayWorkerApp'
            OR (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuNodeApp'
        )
),
ownership as (
    select  distinct full_name
            , galaxies_team
            , team_contact_email
    from    view_repo_ownership
    where   galaxies_team is not null
            and team_contact_email is not null
)

select      data.*
            , ownership.galaxies_team
            , ownership.team_contact_email
from        data
            left join ownership on data.repository = ownership.full_name
where       gucdk_version like '49%' -- affected version is 49.0.2 onwards, so this will catch some extra stacks, but hopefully not too many!
            OR gucdk_version like '5%';
```

</p>
</details>

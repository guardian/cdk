---
"@guardian/cdk": minor
---

Update `GuLoadBalancedAppExperimental` to make the FireLens log driver accessible.
This allows clients to use it to ship the logs of their additional sidecars to Central ELK.
For example:

```ts
const app = new GuLoadBalancedAppExperimental();

if(app.ecsService) {
  const { taskDefinition } = app.ecsService;

  if(!app.fireLensLogDriver) {
    throw new Error("Unable to re-use FireLens log driver"); // This should not happen!
  }

  const fireLensLogDriver = app.fireLensLogDriver;

  taskDefinition.addContainer(
    'aws-otel-collector',
    {
      image: ContainerImage.fromRegistry(
        'public.ecr.aws/aws-observability/aws-otel-collector@sha256:90b3180c21acb9497110480371a413ed91f2836077f8a8fb4507b019d3c481c0',
      ),
      command: ['--config=/etc/ecs/ecs-default-config.yaml'],
      logging: fireLensLogDriver,
    },
  );
}
```

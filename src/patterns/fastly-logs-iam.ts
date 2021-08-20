import type { GuStack } from "../../core";
import { GuPutS3ObjectsPolicy } from "../constructs/iam/policies/s3-put-object";

//export class GuApiLambda extends GuLambdaFunction {
//   constructor(scope: GuStack, id: string, props: GuApiLambdaProps) {
//     super(scope, id, {
//       ...props,
//       errorPercentageMonitoring: props.monitoringConfiguration.noMonitoring ? undefined : props.monitoringConfiguration,
//     });

//     props.apis.forEach((api) => {
//       new LambdaRestApi(this, api.id, {
//         handler: this,
//         ...api,
//       });
//     });
//   }
// }

interface GuFastlyLogsIamProps {
  bucketName: string;
  path: string;
}

export class GuFastlyLogsIam {
  constructor(scope: GuStack, id: string, props: GuFastlyLogsIamProps) {
    const policy = new GuPutS3ObjectsPolicy(scope, id, props);
  }
}

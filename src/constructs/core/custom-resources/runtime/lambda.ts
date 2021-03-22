import { request } from "https";
import { parse } from "url";
// eslint-disable-next-line import/no-unresolved -- this comes from @types/aws-lambda, but eslint can't seem to read it properly
import type { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import SSM from "aws-sdk/clients/ssm";
import type { CustomResourceGetParameterProps } from "../interfaces";

/* eslint-disable -- This function is copied straight from AWS */
// https://github.com/aws/aws-cdk/blob/95438b56bfdc90e94f969f6998e5b5b680cbd7a8/packages/%40aws-cdk/custom-resources/lib/aws-custom-resource/runtime/index.ts#L16-L29
export function flatten(object: Record<string, unknown>): Record<string, string> {
  return Object.assign(
    {},
    ...(function _flatten(child: Record<string, any>, path: string[] = []): any {
      return [].concat(
        ...Object.keys(child).map((key) => {
          const childKey = Buffer.isBuffer(child[key]) ? child[key].toString() : child[key];
          return typeof childKey === "object"
            ? _flatten(childKey, path.concat([key]))
            : { [path.concat([key]).join(".")]: childKey };
        })
      );
    })(object)
  ) as Record<string, string>;
}
/* eslint-enable */

export async function handler(event: CloudFormationCustomResourceEvent, context: Context): Promise<void> {
  try {
    console.log(JSON.stringify(event));

    // Default physical resource id
    let physicalResourceId: string;
    switch (event.RequestType) {
      case "Create":
        physicalResourceId = event.LogicalResourceId;
        break;
      case "Update":
        physicalResourceId = event.PhysicalResourceId;
        break;
      case "Delete":
        await respond("SUCCESS", "OK", event.PhysicalResourceId, {});
        return;
    }

    let data: Record<string, string> = {};

    const getParamsProps = event.ResourceProperties.getParamsProps as string | undefined;

    if (getParamsProps) {
      const request = decodeCall(getParamsProps);
      const ssmClient = new SSM();
      const response = await ssmClient.getParameter(request.apiRequest).promise();
      console.log("Response:", JSON.stringify(response, null, 4));
      data = { ...flatten((response as unknown) as Record<string, string>) };
    }

    console.log("data: ", data);
    await respond("SUCCESS", "OK", physicalResourceId, data);
  } catch (e) {
    console.log(e);
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- e.message is valid, see docs above
    await respond("FAILED", e.message || "Internal Error", context.logStreamName, {});
  }

  function respond(responseStatus: string, reason: string, physicalResourceId: string, data: Record<string, string>) {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: reason,
      PhysicalResourceId: physicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: false,
      Data: data,
    });

    console.log("Responding", responseBody);
    const parsedUrl = parse(event.ResponseURL);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: "PUT",
      headers: { "content-type": "", "content-length": responseBody.length },
    };

    return new Promise((resolve, reject) => {
      try {
        const r = request(requestOptions, resolve);
        r.on("error", reject);
        r.write(responseBody);
        r.end();
      } catch (e) {
        reject(e);
      }
    });
  }
}

function decodeCall(call: string): CustomResourceGetParameterProps {
  return JSON.parse(call) as CustomResourceGetParameterProps;
}

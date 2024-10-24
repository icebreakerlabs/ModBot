import axios, { AxiosError } from "axios";

import { CheckFunction, CheckFunctionArgs, RuleDefinition } from "~/rules/rules.type";

export async function webhook(args: CheckFunctionArgs) {
  const { user, rule, channel } = args;
  const { url, failureMode } = rule.args;

  const maxTimeout = 5_000;

  // dont throw on 400
  return axios
    .post(
      url,
      {
        user,
        channel: {
          id: channel.id,
        },
      },
      {
        headers: {
          "x-webhook-secret": process.env.THIRDPARTY_WEBHOOK_SECRET,
        },
        timeout: maxTimeout,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 400,
      }
    )
    .then((response) => {
      let message = response.data.message?.substring(0, 75);
      if (!message) {
        message = response.status === 200 ? "Webhook rule triggered" : "Webhook rule did not trigger";
      }

      return {
        result: response.status === 200,
        message,
      };
    })
    .catch((err: AxiosError) => {
      console.error(
        `[${args.channel.id}] webhook to ${url} failed`,
        err.response?.status,
        err.response?.statusText,
        err.response?.data
      );

      if (err.code === "ECONNABORTED") {
        return {
          result: failureMode === "trigger" ? true : false,
          message:
            failureMode === "trigger"
              ? `Webhook didn't respond within ${maxTimeout / 1000}s, rule is set to trigger on failure`
              : `Webhook did not respond within ${maxTimeout / 1000}s, rule is set to not trigger on failure. `,
        };
      } else {
        return {
          result: failureMode === "trigger" ? true : false,
          message:
            failureMode === "trigger"
              ? "Webhook failed but rule is set to trigger on failure"
              : "Webhook failed and rule is set to not trigger on failure",
        };
      }
    });
}

type RuleName = "webhook";
export const webhookRulesFunction: Record<RuleName, CheckFunction> = {
  webhook: webhook,
};

export const webhookRulesDefinitions: Record<RuleName, RuleDefinition> = {
  webhook: {
    name: "webhook",
    author: "modbot",
    authorUrl: "https://modbot.sh",
    authorIcon: `/icons/modbot.png`,
    allowMultiple: false,
    category: "all",
    friendlyName: "Webhook",
    checkType: "user",
    description: "Use an external service to determine if the user should be invited into the channel.",
    hidden: false,
    invertable: false,
    args: {
      url: {
        type: "string",
        friendlyName: "URL",
        placeholder: "https://example.com/webhook",
        required: true,
        description:
          "A post request will be made with { user, channel } data. If the webhook returns a 200, the rule will be triggered, if it returns a 400, it will not. Return a json response in either case with a message to include a reason in the activity logs. Maximum of 75 characters. A response must return within 5 seconds. Example: HTTP POST example.com/webhook { user, channel } -> 200 {'message': 'User belongs to BAYC club'}",
      },
      failureMode: {
        type: "select",
        required: true,
        friendlyName: "If the webhook fails or times out...",
        description:
          "Example: Let's say you have only this rule in the section \"When any of the following rules are met, then invite the user to channel.\". If you choose 'Trigger this rule' and the webhook fails, the user will be invited into channel. If you choose 'Do not trigger this rule', the user will not be invited into channel.",
        defaultValue: "doNotTrigger",
        options: [
          { value: "trigger", label: "Trigger this rule" },
          { value: "doNotTrigger", label: "Do not trigger this rule" },
        ],
      },
    },
  },
};

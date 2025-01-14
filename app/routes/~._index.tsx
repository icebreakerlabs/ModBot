/* eslint-disable react/no-unescaped-entities */
import { typedjson, useTypedLoaderData } from "remix-typedjson";

import { db } from "~/lib/db.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Button, ButtonProps } from "~/components/ui/button";
import { getSharedEnv, requireUser, successResponse } from "~/lib/utils.server";
import { RefreshCwIcon } from "lucide-react";
import { Link, useFetcher } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { cn, PlanType, userPlans } from "~/lib/utils";
import { refreshAccountStatus } from "~/lib/subscription.server";
import { ModeratedChannel } from "@prisma/client";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser({ request });

  const channels = await db.moderatedChannel.findMany({
    where: {
      OR: [
        {
          comods: {
            some: {
              fid: user.id,
            },
          },
        },
        {
          userId: user.id,
        },
      ],
    },
    include: {
      comods: true,
    },
  });

  const createdChannels = channels.filter((channel) => channel.userId === user.id).length;
  const usages = await db.usage.findMany({
    where: {
      userId: user.id,
      monthYear: new Date().toISOString().slice(0, 7),
    },
  });
  const totalCastsProcessed = usages.reduce((acc, usage) => acc + usage.castsProcessed, 0);

  return typedjson({
    user,
    channels,
    usages,
    totalCastsProcessed,
    createdChannels,
    plans: userPlans,
    env: getSharedEnv(),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser({ request });
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "checkAccountStatus") {
    const plan = await refreshAccountStatus({ fid: user.id });
    return successResponse({
      request,
      message: `Refreshed! You are on the ${plan.plan} plan.`,
    });
  }

  return typedjson({ success: true });
}

export default function FrameConfig() {
  const { channels, user, totalCastsProcessed, createdChannels, plans } = useTypedLoaderData<typeof loader>();

  const plan = plans[user.plan as PlanType];
  const isNearUsage = totalCastsProcessed >= plan.maxCasts - plan.maxCasts * 0.15;
  const pctUsed = `${Math.round((totalCastsProcessed / plan.maxCasts) * 100)}%`;
  const isOverUsage = totalCastsProcessed >= plan.maxCasts;
  const isMaxChannels = createdChannels >= plan.maxChannels;

  return (
    <div className="space-y-4">
      {channels.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to ModBot</CardTitle>
            <CardDescription>Creating a bot for your channel just takes a few seconds.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Button variant={"secondary"} asChild>
              <Link className="no-underline" to="/~/channels/new/1">
                + New Bot
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {channels.length > 0 && (
        <div className="space-y-12">
          {isNearUsage && !isOverUsage && (
            <Alert>
              <AlertTitle>You've used {pctUsed} of your monthly cast limit.</AlertTitle>
              <AlertDescription>
                <p>
                  Upgrade to{" "}
                  <a href="https://warpcast.com/haole" target="_blank" rel="noreferrer">
                    Prime
                  </a>{" "}
                  or{" "}
                  <a href="https://warpcast.com/haole" target="_blank" rel="noreferrer">
                    Ultra
                  </a>{" "}
                  for way more.
                </p>
                <div className="py-2">
                  <hr />
                </div>
                <div className="flex gap-2">
                  <Button variant={"secondary"} size={"sm"} asChild>
                    <Link className="no-underline" to="/~/account">
                      View Usage
                    </Link>
                  </Button>
                  <RefreshAccountButton />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isOverUsage && (
            <Alert>
              <AlertTitle>You're over your monthly usage limit.</AlertTitle>
              <AlertDescription>
                <p>
                  Automated moderation is currently paused. Upgrade to{" "}
                  <a href="https://warpcast.com/haole" target="_blank" rel="noreferrer">
                    Prime
                  </a>{" "}
                  or{" "}
                  <a href="https://warpcast.com/haole" target="_blank" rel="noreferrer">
                    Ultra
                  </a>
                  .
                </p>
                <div className="py-2">
                  <hr />
                </div>
                <div className="flex gap-2">
                  <Button variant={"secondary"} size={"sm"} asChild>
                    <Link className="no-underline" to="/~/account">
                      View Usage
                    </Link>
                  </Button>
                  <RefreshAccountButton />
                </div>
              </AlertDescription>
            </Alert>
          )}

          <section className="space-y-4 w-full">
            <div className="flex items-center justify-between">
              <h2>Bots</h2>
              {isMaxChannels ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>+ New Bot</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Damn, you're a power user.</DialogTitle>
                      <DialogDescription>
                        The maximum number of bots for the {user.plan} plan is {plan.maxChannels}.
                      </DialogDescription>
                      {user.plan === "basic" ? (
                        <div className="py-4 w-full flex flex-col gap-2">
                          <Button asChild>
                            <Link
                              target="_blank"
                              className="no-underline"
                              to="https://warpcast.com/haole"
                              rel="noreferrer"
                            >
                              Prime (5 channels, 25k members, and more)
                            </Link>
                          </Button>
                          <Button asChild>
                            <Link
                              target="_blank"
                              className="no-underline"
                              to="https://warpcast.com/haole"
                              rel="noreferrer"
                            >
                              Ultra (Unlimited Channels, 250k members, and more)
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <p>
                          Reach out to <a href="https://warpcast.com/haole">@haole</a> to upgrade
                        </p>
                      )}
                    </DialogHeader>
                    {/* <DialogFooter>
                      <div className="flex justify-center text-sm border-t gap-2 items-center w-full pt-4">
                        <p>Already upgraded?</p> <RefreshAccountButton />
                      </div>
                    </DialogFooter> */}
                  </DialogContent>
                </Dialog>
              ) : (
                <Button asChild>
                  <Link className="no-underline" to="/~/channels/new/1">
                    + New Bot
                  </Link>
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
              {channels.map((channel) => (
                <Link to={`/~/channels/${channel.id}`} className="no-underline" key={channel.id} prefetch="intent">
                  <ChannelCard channel={channel} />
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function ChannelCard(props: { channel: Pick<ModeratedChannel, "id" | "imageUrl"> }) {
  const { channel } = props;
  return (
    <div className="flex gap-2 rounded-lg p-4 shadow border hover:border-orange-200 hover:shadow-orange-200 transition-all duration-300 items-center">
      <img src={props.channel.imageUrl || ""} alt={channel.id} className="h-12 w-12 rounded-full block  shrink-0" />
      <div className="w-full overflow-hidden">
        <h3
          title={channel.id}
          className=" text-ellipsis whitespace-nowrap overflow-hidden"
          style={{ fontFamily: "Kode Mono" }}
        >
          /{channel.id}
        </h3>
      </div>
    </div>
  );
}

function RefreshAccountButton(props: ButtonProps) {
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <Button
        {...props}
        disabled={loading}
        size="sm"
        variant={"secondary"}
        name="intent"
        value="checkAccountStatus"
        className={cn("w-full sm:w-auto", props.className)}
      >
        {loading ? (
          <>
            <RefreshCwIcon className="animate-spin w-3 h-3 mr-1" /> Refreshing...
          </>
        ) : (
          <>
            <RefreshCwIcon className="w-3 h-3 mr-1" /> Refresh
          </>
        )}
      </Button>
    </fetcher.Form>
  );
}

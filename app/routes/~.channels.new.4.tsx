/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { redirect, typedjson, useTypedLoaderData } from "remix-typedjson";
import { requireUser } from "~/lib/utils.server";
import { getWarpcastChannel } from "~/lib/warpcast.server";
import { Button } from "~/components/ui/button";
import { db } from "~/lib/db.server";
import { automodFid } from "./~.channels.$id";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowUpRight,
  Check,
  CheckCircleIcon,
  CheckIcon,
  CopyCheck,
  CopyIcon,
  Loader,
  LucideCheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { useClipboard } from "~/lib/utils";
import { ChannelHeader } from "./~.channels.new.3";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUser({ request });
  const url = new URL(request.url);
  const channelId = url.searchParams.get("channelId")!;
  const [channel, wcChannel] = await Promise.all([
    db.moderatedChannel.findUniqueOrThrow({
      where: {
        id: channelId,
      },
    }),
    getWarpcastChannel({ channel: channelId }),
  ]);

  const isAutomodSet = automodFid === wcChannel.moderatorFid;

  if (isAutomodSet) {
    throw redirect(`/~/channels/new/5?channelId=${channel.id}`);
  }

  return typedjson({
    user,
    channel,
    wcChannel,
    isAutomodSet,
  });
}

export default function Screen() {
  const { channel, wcChannel, isAutomodSet } = useTypedLoaderData<typeof loader>();
  const [fidSet, setFidSet] = useState(isAutomodSet);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      axios.get(`https://api.warpcast.com/v1/channel?channelId=${channel.id}`).then((rsp) => {
        const updatedWcChannel = rsp.data.result.channel;
        if (updatedWcChannel.moderatorFid === automodFid) {
          clearInterval(interval);
          setFidSet(true);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const { copy, copied } = useClipboard();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <ChannelHeader channel={channel} />
          <CardTitle>
            <h1>Set your channel's moderator to automod</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <ol className=" list-decimal list-inside space-y-2">
              <li>
                Copy the{" "}
                <Button size={"xs"} variant={"outline"} onClick={() => copy("automod")}>
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 inline mr-1" />
                      automod
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3 h-3 inline mr-1" />
                      automod
                    </>
                  )}
                </Button>{" "}
                username
              </li>
              <li>
                Open{" "}
                <a
                  className="no-underline"
                  href={`https://warpcast.com/~/channel/${channel.id}/settings/moderation`}
                  target="_blank"
                  rel="noreferrer"
                >
                  /{channel.id}
                </a>{" "}
                and set the moderator to automod.
              </li>
              <li>Come back here.</li>
            </ol>
            <p>
              {fidSet ? (
                <>
                  <CheckIcon className="text-green-700 w-4 h-4 inline" /> automod is set as moderator.
                </>
              ) : (
                <>
                  <Loader className="w-4 h-4 inline animate-spin mr-1" /> Scanning for changes...
                </>
              )}
            </p>
          </div>
        </CardContent>

        {fidSet && (
          <CardFooter>
            <Button asChild>
              <Link to={`/~/channels/new/5`} className="no-underline">
                Next
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

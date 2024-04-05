/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "node:path";
import { frameResponse, getSharedEnv } from "~/lib/utils.server";
import fs from "node:fs/promises";
import satori from "satori";
import { CSSProperties } from "react";
import sharp from "sharp";
import { actions } from "~/lib/cast-actions.server";
import { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const env = getSharedEnv();
  const url = new URL(request.url);
  const currentIndex = parseInt(url.searchParams.get("index") ?? "1");
  const currentAction = actions[currentIndex];
  const nextIndex = (currentIndex + 1) % actions.length;

  return frameResponse({
    title: "Automod Cast Actions",
    description: "Install automod cast actions",
    image: currentAction.image,
    cacheTtlSeconds: 0,
    postUrl: `${env.hostUrl}/install?index=${nextIndex}`,
    buttons: [
      {
        text: "Install",
        link: actionToInstallLink(currentAction),
      },
      {
        text: "Next",
      },
    ],
  });
}

export async function loader() {
  const env = getSharedEnv();
  const action = actions[0];

  return frameResponse({
    title: "Automod Cast Actions",
    description: "Install automod cast actions",
    postUrl: `${env.hostUrl}/install?index=1`,
    image: action.image,
    cacheTtlSeconds: 0,
    buttons: [
      {
        text: "Install",
        link: actionToInstallLink(action),
      },
      actions.length > 1
        ? {
            text: "Next",
          }
        : null,
    ].filter(Boolean) as any[],
  });
}

export function actionToInstallLink(action: (typeof actions)[number]) {
  const wcUrl = new URL(`https://warpcast.com/~/add-cast-action`);
  wcUrl.searchParams.append("actionType", action.actionType);
  wcUrl.searchParams.append("name", action.name);
  wcUrl.searchParams.append("icon", action.icon);
  wcUrl.searchParams.append("postUrl", action.postUrl);
  return wcUrl.toString();
}

export async function renderInstall(args: { action: string; description: string; filename: string }) {
  const env = getSharedEnv();
  const { action, description, filename } = args;
  //   check if file exists first
  const file = await fs.readFile(path.join(process.cwd(), "public", `${filename}.png`)).catch(() => null);
  if (file) {
    return `${env.hostUrl}/${filename}.png`;
  }

  try {
    const bgImageBuffer = await fs.readFile(path.join(process.cwd(), "public", "automod-cast-action-bg.png"));
    const bgDataUrl = `data:image/png;base64,${bgImageBuffer.toString("base64")}`;
    const fontBuffer = await fs.readFile(path.join(process.cwd(), "public", "fonts", `inter-medium.ttf`));

    const styles: CSSProperties = {
      display: "flex",
      height: "100%",
      width: "100%",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      fontWeight: 600,
      objectFit: "cover",
      position: "relative",
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: 40,
    };

    const svg = await satori(
      <div style={styles}>
        <img
          width={800}
          height={418}
          src={bgDataUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            objectFit: "cover",
          }}
        />
        <div
          style={{
            display: "flex",
            height: 200,
          }}
        >
          &nbsp;
        </div>
        <div
          style={{
            fontFamily: "Inter",
            fontSize: `${styles.fontSize}px`,
            padding: 10,
            color: styles.color,
            display: "flex",
            flexDirection: "column",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {action}
        </div>
        <div
          style={{
            fontFamily: "Inter",
            fontSize: "27px",
            padding: 10,
            color: styles.color,
            display: "flex",
            flexDirection: "column",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {description}
        </div>
      </div>,
      {
        width: 800,
        height: 418,
        fonts: [
          {
            name: "Inter",
            data: fontBuffer,
            style: "normal",
          },
        ],
      }
    );

    const base64 = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();
    await fs.writeFile(path.join(process.cwd(), "public", `${filename}.png`), base64);
    return `${env.hostUrl}/${filename}.png`;
  } catch (e) {
    console.error("couldnt find file", e);
    throw e;
  }
}

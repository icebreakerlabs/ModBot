import { User } from "@neynar/nodejs-sdk/build/neynar-api/v2";
import axios from "axios";

const baseUrl = `https://www.castsense.xyz`;

export async function getChannelStats(props: { channelId: string }) {
  return axios
    .get<CastSenseResponse>(`${baseUrl}/api/channel/${props.channelId}/stats`)
    .then((res) => res.data);
}

export async function getTopEngagers(props: { channelId: string }) {
  return axios.get(`${baseUrl}/api/channel/${props.channelId}/top-engagers`).then((res) => res.data);
}

export type TopEngagersResponse = {
  results: Array<User["profile"]>;
};

export type CastSenseResponse = {
  casts_percentage_change: number;
  current_period_casts: number;
  current_period_likes: number;
  current_period_mentions: null;
  current_period_recasts: number;
  current_period_replies: number;
  total_followers: number;
  likes_percentage_change: number;
  mentions_percentage_change: number | null;
  recasts_percentage_change: number;
  replies_percentage_change: number;
  churn_rate: number;
};

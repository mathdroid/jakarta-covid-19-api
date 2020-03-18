import unfetch from "isomorphic-unfetch";
import withRetry from "@zeit/fetch-retry";
import { NowResponse } from "@now/node";

const fetch = withRetry(unfetch);

export default async (_, res: NowResponse) => {
  const response = await fetch("https://corona-scraper.glitch.me");
  const json = await response.json();
  res.json(json);
};

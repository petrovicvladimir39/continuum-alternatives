import { redirect } from "next/navigation";

/** /v2/network/feed is the network home. */
export default function NetworkFeedPage() {
  redirect("/v2/network");
}

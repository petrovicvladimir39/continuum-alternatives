import { serve } from "inngest/next";
import { functions, inngest } from "@continuum/pipeline";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});

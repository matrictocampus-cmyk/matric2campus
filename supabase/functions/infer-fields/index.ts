import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { subjects } = await req.json();

  let fields: string[] = [];

  if (
    subjects.includes("Mathematics") ||
    subjects.includes("Physical Science")
  ) {
    fields.push("Engineering Studies");
  }

  if (subjects.includes("Accounting")) {
    fields.push("Business Studies");
  }

  return new Response(
    JSON.stringify({
      status: "success",
      fields
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
});

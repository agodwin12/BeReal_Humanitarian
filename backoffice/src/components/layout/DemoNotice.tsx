import { PlugZap } from "lucide-react";

import { Card } from "@/components/ui/card";

// Shown by data screens while NEXT_PUBLIC_API_URL is unset.
export function DemoNotice({ screen }: { screen: string }) {
  return (
    <Card className="gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-5 ring-0 shadow-none">
      <h2 className="flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.18em] text-amber-800 uppercase">
        <PlugZap className="size-4" />
        Demo mode
      </h2>
      <p className="text-sm text-amber-900">
        {screen} reads live data from the API. Set <code className="rounded bg-white/70 px-1">NEXT_PUBLIC_API_URL</code> in{" "}
        <code className="rounded bg-white/70 px-1">.env.local</code> and restart the backoffice to use it.
      </p>
    </Card>
  );
}

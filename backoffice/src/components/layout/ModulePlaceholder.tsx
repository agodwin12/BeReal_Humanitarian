import { CircleDashed, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { PHASES, type ModuleDef } from "@/lib/modules";

const ROLE_LABEL = { super_admin: "Super Admin", editor: "Editor", read_only: "Read-only" } as const;

// Rendered for every module that isn't built yet: the scope it will cover,
// its delivery phase, and who will be allowed in.
export function ModulePlaceholder({ module }: { module: ModuleDef }) {
  return (
    <>
      <PageHeader
        eyebrow={`Phase ${module.phase}`}
        title={module.title}
        description={module.description}
        actions={
          <Badge variant="outline" className="gap-1.5 rounded-[8px] border-amber-200 bg-amber-50 text-amber-800">
            <CircleDashed className="size-3.5" />
            Not built yet
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="gap-3 rounded-[14px] px-5 ring-0 border border-border shadow-none">
          <h2 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
            What this screen will handle
          </h2>
          <ul className="grid gap-2">
            {module.capabilities.map((capability) => (
              <li key={capability} className="grid grid-cols-[18px_1fr] gap-2 text-sm text-foreground">
                <span className="mt-1.5 size-2 rounded-full bg-brand-purple-400" aria-hidden="true" />
                {capability}
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-4 content-start">
          <Card className="gap-2 rounded-[14px] px-5 ring-0 border border-border shadow-none">
            <h2 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
              Delivery
            </h2>
            <p className="text-sm text-foreground">
              <strong>Phase {module.phase}</strong> — {PHASES[module.phase]}
            </p>
          </Card>
          <Card className="gap-2 rounded-[14px] px-5 ring-0 border border-border shadow-none">
            <h2 className="flex items-center gap-1.5 text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
              <Lock className="size-3.5" />
              Access
            </h2>
            <p className="text-sm text-foreground">
              {module.roles
                ? module.roles.map((role) => ROLE_LABEL[role]).join(", ")
                : "Super Admin, Editor, Read-only (view)"}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

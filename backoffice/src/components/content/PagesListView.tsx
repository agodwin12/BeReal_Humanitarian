"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { siteUrl } from "@/lib/content";
import { formatRelative } from "@/lib/format";
import type { PageSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageStatusBadge({ page }: { page: { hasUnpublishedChanges: boolean; publishedAt: string | null } }) {
  const tone = page.hasUnpublishedChanges
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : page.publishedAt
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-border bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("rounded-[6px] font-bold", tone)}>
      {page.hasUnpublishedChanges ? "Unpublished changes" : page.publishedAt ? "Published" : "Site defaults"}
    </Badge>
  );
}

export function PagesListView() {
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<PageSummary[]>("/api/pages")
      .then(({ data }) => setPages(data))
      .catch((err) => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong."));
  }, []);

  if (isDemoMode) return <DemoNotice screen="Pages" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  return (
    <div className="grid gap-4">
      <Card className="gap-2 rounded-[14px] border border-brand-purple-100 bg-brand-purple-50 px-5 ring-0 shadow-none">
        <p className="text-sm text-brand-purple-900">
          Every text on the website starts from its built-in copy in English, French and Spanish. Edit any field here, save a draft, preview it on the site, then publish.
          Leaving a field empty keeps the built-in text. “Global” holds the header, footer, form labels and the shared call-to-action band.
        </p>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-[14px] border border-border p-0 ring-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Edited fields</TableHead>
              <TableHead>Last published</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages === null
              ? [0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5" colSpan={5}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : pages.map((page) => (
                  <TableRow key={page.slug}>
                    <TableCell className="pl-5">
                      <div className="font-bold text-foreground">{page.title}</div>
                      <div className="text-[0.76rem] text-muted-foreground">{page.path ?? "Shared across pages"}</div>
                    </TableCell>
                    <TableCell>
                      <PageStatusBadge page={page} />
                    </TableCell>
                    <TableCell className="text-[0.82rem] text-muted-foreground">{page.overrideCount === 0 ? "None" : `${page.overrideCount} live`}</TableCell>
                    <TableCell className="text-[0.82rem] text-muted-foreground">{page.publishedAt ? formatRelative(page.publishedAt) : "—"}</TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end gap-1.5">
                        {page.path ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={siteUrl(page.path)} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-3.5" />
                              View
                            </a>
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/content/pages/${page.slug}`}>
                            <Pencil className="size-3.5" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

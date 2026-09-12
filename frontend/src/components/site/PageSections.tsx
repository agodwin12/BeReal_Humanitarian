import { Fragment, type ReactNode } from "react";

import { orderSections, type PageContent } from "@/lib/cms";

// Renders a page's sections in the order (and visibility) saved in the
// backoffice Pages editor; `order` is the built-in default.
export function PageSections<K extends string>({
  content,
  order,
  blocks,
}: {
  content: PageContent;
  order: readonly K[];
  blocks: Record<K, ReactNode>;
}) {
  return (
    <>
      {orderSections(content, order).map((key) => (
        <Fragment key={key}>{blocks[key]}</Fragment>
      ))}
    </>
  );
}

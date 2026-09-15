import { Suspense } from "react";
import MigClient from "@/components/MigClient";

export default function MigPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-sea-muted">Indlæser…</p>}
    >
      <MigClient />
    </Suspense>
  );
}

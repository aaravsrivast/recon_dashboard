import { Suspense } from "react";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { runReconciliation } from "@/lib/api";

async function loadReconciliation() {
  try {
    return await runReconciliation();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const initialData = await loadReconciliation();

  return (
    <Suspense fallback={<DashboardView initialData={null} />}>
      <DashboardView initialData={initialData} />
    </Suspense>
  );
}

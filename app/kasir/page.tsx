import { Suspense } from "react";
import { KasirDashboardPage } from "./KasirClient";
export default function Page() {
  return (
    <Suspense>
      <KasirDashboardPage />
    </Suspense>
  );
}

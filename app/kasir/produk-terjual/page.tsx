import { Suspense } from "react";
import { KasirSalesPage } from "../KasirClient";
export default function Page() {
  return (
    <Suspense>
      <KasirSalesPage />
    </Suspense>
  );
}

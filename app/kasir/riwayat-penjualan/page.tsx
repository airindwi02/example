import { Suspense } from "react";
import { KasirHistoryPage } from "../KasirClient";
export default function Page() {
  return (
    <Suspense>
      <KasirHistoryPage />
    </Suspense>
  );
}

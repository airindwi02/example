import { requireDashboard } from "../../lib/auth";
export default async function DashboardGate({ path, children }: { path: string; children: React.ReactNode }) {
  await requireDashboard(path);
  return children;
}

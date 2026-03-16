import { DashboardView } from "@/components/archive/dashboard-view";
import { getServerDashboardData, type DashboardData } from "@/lib/archive/server-records";
import { requireViewerUser } from "@/lib/supabase/access";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export default async function HomePage() {
  let dashboardData: DashboardData | null = null;

  if (isSupabaseAdminConfigured()) {
    const viewer = await requireViewerUser("/");
    dashboardData = await getServerDashboardData(viewer?.email);
  }

  return <DashboardView serverData={dashboardData} />;
}

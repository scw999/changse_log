import { AdminEditor } from "@/components/archive/admin-editor";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireAdminUser } from "@/lib/supabase/access";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return <AdminEditor />;
  }

  await requireAdminUser("/admin");

  return <AdminEditor />;
}

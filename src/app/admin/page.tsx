import { redirect } from "next/navigation";

import { AdminEditor } from "@/components/archive/admin-editor";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return <AdminEditor />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  return <AdminEditor />;
}

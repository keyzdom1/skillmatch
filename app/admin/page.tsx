import AdminDashboard from "@/components/AdminDashboard";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="font-display text-3xl font-bold">Admin</h1>
        <div className="card">
          <p className="text-sm text-ink/80">
            You don&apos;t have admin access. Only accounts listed in{" "}
            <code className="font-mono text-xs">ADMIN_EMAILS</code> can view this
            dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">
          Signed in as {adminUser.email}
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}
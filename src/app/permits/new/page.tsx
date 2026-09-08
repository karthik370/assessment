import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import NewPermitForm from "@/components/NewPermitForm";

export default async function NewPermitPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plants = await prisma.plant.findMany({
    include: {
      areas: {
        include: {
          equipment: { select: { id: true, tag: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">New Permit to Work</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete all steps. You can save as a draft and come back later.
          </p>
        </div>
        <NewPermitForm plants={plants as any} />
      </div>
    </AppShell>
  );
}

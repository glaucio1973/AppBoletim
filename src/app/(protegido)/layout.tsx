import { verifySession } from "@/lib/dal";
import { Header } from "@/components/layout/Header";

export default async function ProtegidoLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Header nome={session.nome} ra={session.ra} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

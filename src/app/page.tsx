import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/dal";

export default async function HomePage() {
  const session = await getOptionalSession();
  redirect(session?.ra ? "/dashboard" : "/login");
}

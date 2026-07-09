import { Skeleton } from "@/components/ui/Skeleton";

export default function BoletimDetalhadoLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

import { StoreDetailClient } from "@/components/StoreDetailClient";
import { parseSearchRequest } from "@/lib/searchRequest";

type PageParams = Promise<{ storeId: string }>;
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StoreDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const [{ storeId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const request = parseSearchRequest(resolvedSearchParams);

  return <StoreDetailClient storeId={storeId} request={request} />;
}

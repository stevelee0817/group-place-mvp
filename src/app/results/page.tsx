import { ResultsClient } from "@/components/ResultsClient";
import { parseSearchRequest } from "@/lib/searchRequest";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResultsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const resolvedSearchParams = await searchParams;
  const request = parseSearchRequest(resolvedSearchParams);

  return <ResultsClient request={request} />;
}

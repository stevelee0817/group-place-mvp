import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-950 p-5 text-white">
        <p className="text-sm font-medium text-slate-300">대학가 단체 모임 MVP</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight">단체 모임 장소 찾기</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          정확한 실시간 좌석 수 대신, 매장의 단체 착석 구조와 간단한 상태값을 바탕으로 문의할 가치가 높은 후보를 압축합니다.
        </p>
      </section>

      <SearchForm />

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="font-bold text-slate-950">MVP에서 보는 것</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          <li>• 같이 앉을 가능성이 높은지</li>
          <li>• 분리 착석까지 고려하면 가능한지</li>
          <li>• 지금 바로 전화해야 할 후보인지</li>
        </ul>
      </section>
    </div>
  );
}

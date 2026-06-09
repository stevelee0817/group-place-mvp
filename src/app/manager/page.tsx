import { ManagerStoreEditor } from "@/components/ManagerStoreEditor";

export default function ManagerPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-slate-950 p-5 text-white">
        <p className="text-sm text-slate-300">Mock 관리자 화면</p>
        <h1 className="mt-1 text-3xl font-extrabold">단체 상태 업데이트</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          인증 없이 샘플 매장의 현재 단체 상태와 시간대 상태를 수정합니다. 저장값은 이 브라우저의 localStorage에만 남습니다.
        </p>
      </section>

      <ManagerStoreEditor />
    </div>
  );
}

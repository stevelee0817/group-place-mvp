import Link from "next/link";

export function EmptyState({
  title,
  description,
  href = "/",
  actionText = "다시 검색하기",
}: {
  title: string;
  description: string;
  href?: string;
  actionText?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
      >
        {actionText}
      </Link>
    </div>
  );
}

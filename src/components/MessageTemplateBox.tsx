"use client";

import { useState } from "react";

export function MessageTemplateBox({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-950">문의 메시지 템플릿</h2>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{message}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        실제 예약 확정 문구가 아니라, 매장에 가능성을 확인하기 위한 문의용 문구입니다.
      </p>
    </div>
  );
}

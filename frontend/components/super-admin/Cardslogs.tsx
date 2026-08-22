"use client";

import { useMemo, useState } from "react";
import { Search, FileDown, Printer } from "lucide-react";

export type AdminCardLogRow = {
  id: string;
  srNo: number;
  message: string;
  time: string;
};

export const sampleCardLogs: AdminCardLogRow[] = [
  {
    id: "log-10",
    srNo: 10,
    message:
      "Super Admin [1] changes Anup-Panwar4 expiry date from 14-Aug-2056 to 20-Aug-2026 on 14-Aug-2026 11:20 AM",
    time: "14-Aug-2026 11:20 AM",
  },
  {
    id: "log-9",
    srNo: 9,
    message:
      "Super Admin [1] changes AMIT-MOONDAL35 contact details on 14-Aug-2026 10:18 AM",
    time: "14-Aug-2026 10:18 AM",
  },
  {
    id: "log-8",
    srNo: 8,
    message:
      "System marked Gurpreet-SinghUppal25 as expired on 14-Aug-2026 09:00 AM",
    time: "14-Aug-2026 09:00 AM",
  },
  {
    id: "log-7",
    srNo: 7,
    message:
      "Super Admin [1] activated Dinesh-kothari60 on 14-Aug-2026 08:55 AM",
    time: "14-Aug-2026 08:55 AM",
  },
  {
    id: "log-6",
    srNo: 6,
    message:
      "Super Admin [1] deactivated SUVANKAR-PURKAIT71 on 13-Aug-2026 06:30 PM",
    time: "13-Aug-2026 06:30 PM",
  },
  {
    id: "log-5",
    srNo: 5,
    message:
      "Keshav Kunthe [1] changes keshav-kunthe expiry date from 28-Feb-2021 to 10-Feb-2020 on 22-Feb-2020 08:50 PM",
    time: "22-Feb-2020 08:50 PM",
  },
  {
    id: "log-4",
    srNo: 4,
    message:
      "Keshav Kunthe [1] changes keshav-kunthe expiry date from 10-Feb-2020 to 28-Feb-2021 on 22-Feb-2020 08:52 PM",
    time: "22-Feb-2020 08:52 PM",
  },
  {
    id: "log-3",
    srNo: 3,
    message:
      "Girish Borde [2] changes kiran-bhagwat expiry date from 20-Feb-2020 to 21-Feb-2021 on 26-Feb-2020 10:49 AM",
    time: "26-Feb-2020 10:49 AM",
  },
  {
    id: "log-2",
    srNo: 2,
    message:
      "Keshav Kunthe [1] changes sweet-shop expiry date from 24-Jan-2021 to 26-Feb-2020 on 03-Mar-2020 10:54 PM",
    time: "03-Mar-2020 10:54 PM",
  },
  {
    id: "log-1",
    srNo: 1,
    message: "Keshav Kunthe [1] deleted sweet-shop on 16-Mar-2020 02:09 PM",
    time: "16-Mar-2020 02:09 PM",
  },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function toCsv(rows: AdminCardLogRow[]): string {
  const headers = ["Sr. No.", "Logs", "Time"];
  const lines = rows.map((r) =>
    [
      r.srNo,
      `"${r.message.replace(/"/g, '""')}"`,
      r.time,
    ].join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printTable(rows: AdminCardLogRow[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td>${r.srNo}</td><td>${r.message}</td><td>${r.time}</td></tr>`,
    )
    .join("");
  win.document.write(`
    <html>
      <head><title>All Card Logs</title></head>
      <body>
        <h2>All Card Logs</h2>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
          <thead><tr><th>Sr. No.</th><th>Logs</th><th>Time</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.print();
}

export default function CardLogsPanel({
  logs = sampleCardLogs,
}: {
  logs?: AdminCardLogRow[];
}) {
  const [rows] = useState(logs);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...rows].sort((a, b) => b.srNo - a.srNo);
    return rows
      .filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.time.toLowerCase().includes(q),
      )
      .sort((a, b) => b.srNo - a.srNo);
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => printTable(filtered)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#BC7C10]" />
              PDF
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  toCsv(filtered),
                  "card-logs.xls",
                  "application/vnd.ms-excel",
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#BC7C10]" />
              Excel
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(toCsv(filtered), "card-logs.csv", "text/csv")
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#BC7C10]" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => printTable(filtered)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <Printer className="h-3.5 w-3.5 text-[#BC7C10]" />
              Print
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#5c5346]">
            Show
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-black/10 bg-[#FFFCF7] px-2.5 py-1.5 text-sm text-[#141414] focus:border-[#BC7C10] focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            entries
          </label>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8a8174]" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search logs…"
            className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] py-2.5 pr-3 pl-9 text-sm text-[#141414] placeholder:text-[#8a8174]/70 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[62%]" />
            <col className="w-[28%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-black/[0.06] text-[11px] font-bold tracking-wide text-[#8a8174] uppercase">
              <th className="px-4 py-3">Sr. No.</th>
              <th className="px-4 py-3">Logs</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((log) => (
              <tr
                key={log.id}
                className="border-b border-black/[0.04] last:border-0"
              >
                <td className="px-4 py-3 font-semibold tabular-nums text-[#8a8174]">
                  {log.srNo}
                </td>
                <td className="px-4 py-3 leading-relaxed text-[#5c5346]">
                  {log.message}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[#5c5346]">
                  {log.time}
                </td>
              </tr>
            ))}

            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-sm text-[#8a8174]"
                >
                  No logs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-4 text-sm text-[#5c5346]">
        <p>
          Showing {(safePage - 1) * pageSize + 1} to{" "}
          {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}{" "}
          entries
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i + 1)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                safePage === i + 1
                  ? "bg-[#BC7C10] text-white"
                  : "border border-black/[0.08] text-[#141414] hover:bg-black/[0.03]"
              }`}
            >
              {i + 1}
            </button>
          ))}
          {totalPages > 5 ? (
            <span className="px-2 text-[#8a8174]">…</span>
          ) : null}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

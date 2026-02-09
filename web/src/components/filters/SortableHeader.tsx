"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type Props = {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  onSort: (key: string) => void;
  align?: "left" | "right";
};

export function SortableHeader({ label, sortKey, currentSort, currentDir, onSort, align = "left" }: Props) {
  const active = currentSort === sortKey;
  const Icon = active ? (currentDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th className={`${align === "right" ? "text-right" : "text-left"} px-4 py-3 font-medium`} scope="col">
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 ${align === "right" ? "justify-end ml-auto" : ""} hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 rounded`}
        aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label} <Icon className={`w-3.5 h-3.5 ${active ? "" : "opacity-40"}`} />
      </button>
    </th>
  );
}

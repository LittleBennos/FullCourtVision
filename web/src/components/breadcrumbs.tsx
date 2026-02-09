import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center flex-wrap gap-1 text-sm">
        <li className="flex items-center">
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-500 flex-shrink-0" />
            {item.href ? (
              <Link
                href={item.href}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-400 truncate max-w-[200px] sm:max-w-none">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

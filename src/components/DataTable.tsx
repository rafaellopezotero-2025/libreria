import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  searchText?: (row: T) => string;
  pageSize?: number;
  empty?: string;
  toolbar?: ReactNode;
  rowKey: (row: T) => string;
};

export function DataTable<T>({
  rows,
  columns,
  searchText,
  pageSize = 15,
  empty = "Sin resultados",
  toolbar,
  rowKey,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim() && searchText) {
      const needle = q.toLowerCase();
      out = out.filter((r) => searchText(r).toLowerCase().includes(needle));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          if (va === vb) return 0;
          return (va > vb ? 1 : -1) * sort.dir;
        });
      }
    }
    return out;
  }, [rows, q, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchText && (
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </div>
        )}
        {toolbar}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.sortValue ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() =>
                        setSort((s) =>
                          s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 },
                        )
                      }
                    >
                      {c.header} <ArrowUpDown className="size-3" />
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              slice.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Anterior
          </Button>
          <span className="tabular">
            {current + 1} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

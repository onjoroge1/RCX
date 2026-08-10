import { cn } from '@/lib/utils'

/**
 * Two modes:
 * - Declarative: pass `headers` + `rows` for uniform tables.
 * - Compositional: pass `children` (THead/TRow/TD) when cells need bespoke markup.
 */
type DataTableProps = { className?: string } & (
  | { headers: string[]; rows: React.ReactNode[][]; children?: never }
  | { children: React.ReactNode; headers?: never; rows?: never }
)

export function DataTable(props: DataTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border bg-card', props.className)}>
      <table className="w-full text-sm">
        {props.rows ? (
          <>
            <THead cols={props.headers} />
            <tbody>
              {props.rows.map((cells, r) => (
                <TRow key={r}>
                  {cells.map((cell, c) => (
                    <TD key={c}>{cell}</TD>
                  ))}
                </TRow>
              ))}
            </tbody>
          </>
        ) : (
          props.children
        )}
      </table>
    </div>
  )
}

export function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border">
        {cols.map((c, i) => (
          <th
            key={c}
            className={cn(
              'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
              i === 0 ? 'text-left' : 'text-left',
            )}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function TRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border/70 last:border-0 transition-colors hover:bg-muted/50">{children}</tr>
}

export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle text-foreground', className)}>{children}</td>
}

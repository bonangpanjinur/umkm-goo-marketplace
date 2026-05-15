// Compute a friendly diff between two Puck data trees.
// Compares the flat content array (block list) and root props.

type PuckBlock = { type: string; props: Record<string, unknown> & { id?: string } };
type PuckData = { content?: PuckBlock[]; root?: { props?: Record<string, unknown> } };

export type BlockDiffEntry =
  | { kind: "added"; type: string; id: string; index: number }
  | { kind: "removed"; type: string; id: string; index: number }
  | { kind: "moved"; type: string; id: string; from: number; to: number }
  | { kind: "changed"; type: string; id: string; index: number; fields: string[] };

export type LayoutDiff = {
  blocks: BlockDiffEntry[];
  rootChanged: boolean;
  unchanged: number;
};

function asTree(d: unknown): PuckData {
  if (!d || typeof d !== "object") return { content: [], root: { props: {} } };
  return d as PuckData;
}

function blockId(b: PuckBlock, fallbackIdx: number): string {
  return (b.props?.id as string | undefined) ?? `${b.type}#${fallbackIdx}`;
}

function shallowFieldDiff(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  const diff: string[] = [];
  for (const k of keys) {
    if (k === "id") continue;
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) diff.push(k);
  }
  return diff;
}

export function diffPuckData(prev: unknown, next: unknown): LayoutDiff {
  const A = asTree(prev);
  const B = asTree(next);
  const aList = A.content ?? [];
  const bList = B.content ?? [];

  const aMap = new Map<string, { block: PuckBlock; index: number }>();
  aList.forEach((b, i) => aMap.set(blockId(b, i), { block: b, index: i }));
  const bMap = new Map<string, { block: PuckBlock; index: number }>();
  bList.forEach((b, i) => bMap.set(blockId(b, i), { block: b, index: i }));

  const entries: BlockDiffEntry[] = [];
  let unchanged = 0;

  for (const [id, { block, index }] of aMap) {
    const inB = bMap.get(id);
    if (!inB) {
      entries.push({ kind: "removed", type: block.type, id, index });
    } else {
      const fields = shallowFieldDiff(block.props ?? {}, inB.block.props ?? {});
      if (fields.length > 0) {
        entries.push({ kind: "changed", type: block.type, id, index: inB.index, fields });
      } else if (inB.index !== index) {
        entries.push({ kind: "moved", type: block.type, id, from: index, to: inB.index });
      } else {
        unchanged++;
      }
    }
  }
  for (const [id, { block, index }] of bMap) {
    if (!aMap.has(id)) entries.push({ kind: "added", type: block.type, id, index });
  }

  const rootChanged =
    JSON.stringify(A.root?.props ?? {}) !== JSON.stringify(B.root?.props ?? {});

  return { blocks: entries, rootChanged, unchanged };
}

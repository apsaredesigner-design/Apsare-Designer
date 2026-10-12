"use client";
/**
 * CategoryTree: nested, indented list of categories in sortOrder order with
 * expand/collapse (disclosure buttons with aria-expanded), image, active badge,
 * product count, move up/down within the same parent, and edit / add-subcategory /
 * delete actions. On narrow screens the actions wrap under the name.
 */
import { IconButton } from "@/components/admin/IconButton";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import { Badge } from "@/components/admin/StatusBadge";
import { cx } from "@/components/admin/styles";
import { formatNumber } from "@/lib/admin/format";
import type { CategoryTreeNode } from "@/lib/admin/types";
import { Thumb } from "../../shared/Thumb";

export interface TreeActions {
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (node: CategoryTreeNode) => void;
  onAddChild: (node: CategoryTreeNode) => void;
  onDelete: (node: CategoryTreeNode) => void;
  /** Move `siblings[index]` one place up (-1) or down (+1) among its siblings. */
  onMove: (siblings: CategoryTreeNode[], index: number, delta: -1 | 1) => void;
  /** Disables the move buttons while a move is saving. */
  moving?: boolean;
}

interface NodeProps {
  node: CategoryTreeNode;
  depth: number;
  siblings: CategoryTreeNode[];
  index: number;
  actions: TreeActions;
}

function Node({ node, depth, siblings, index, actions }: NodeProps) {
  const hasChildren = node.children.length > 0;
  const open = actions.expanded.has(node.id);
  const groupId = `cat-children-${node.id}`;
  const products = `${formatNumber(node._count.products)} product${node._count.products === 1 ? "" : "s"}`;
  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-x-2 border-b border-ink/5 py-1.5 pr-2 hover:bg-ivory/80"
        style={{ paddingLeft: `calc(${depth} * 1.25rem + 0.25rem)` }}
      >
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-2">
          {hasChildren ? (
            <IconButton
              label={`${open ? "Collapse" : "Expand"} ${node.name}`}
              aria-expanded={open}
              aria-controls={groupId}
              onClick={() => actions.onToggle(node.id)}
            >
              {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </IconButton>
          ) : (
            <span aria-hidden className="w-11 shrink-0" />
          )}
          {node.imageUrl && (
            <span className="hidden sm:block">
              <Thumb src={node.imageUrl} alt="" className="size-10" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className={cx("font-semibold break-words", node.isActive ? "text-ink" : "text-ink/55")}>{node.name}</span>
              {!node.isActive && <Badge tone="neutral">Inactive</Badge>}
            </p>
            <p className="truncate font-mono text-xs text-ink/50">
              /{node.slug} · #{node.sortOrder}
            </p>
            <p className="text-xs text-ink/60 sm:hidden">{products}</p>
          </div>
          <span className="hidden shrink-0 text-xs text-ink/60 tabular-nums sm:block">{products}</span>
        </div>
        <div className="ml-auto flex shrink-0">
          <IconButton
            label={`Move ${node.name} up`}
            disabled={index === 0 || actions.moving}
            onClick={() => actions.onMove(siblings, index, -1)}
          >
            <ArrowUpIcon />
          </IconButton>
          <IconButton
            label={`Move ${node.name} down`}
            disabled={index === siblings.length - 1 || actions.moving}
            onClick={() => actions.onMove(siblings, index, 1)}
          >
            <ArrowDownIcon />
          </IconButton>
          <IconButton label={`Add subcategory under ${node.name}`} onClick={() => actions.onAddChild(node)}>
            <PlusIcon />
          </IconButton>
          <IconButton label={`Edit ${node.name}`} onClick={() => actions.onEdit(node)}>
            <PencilIcon />
          </IconButton>
          <IconButton label={`Delete ${node.name}`} variant="danger" onClick={() => actions.onDelete(node)}>
            <TrashIcon />
          </IconButton>
        </div>
      </div>
      {hasChildren && open && (
        <ul id={groupId} aria-label={`${node.name} subcategories`}>
          {node.children.map((c, i) => (
            <Node key={c.id} node={c} depth={depth + 1} siblings={node.children} index={i} actions={actions} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoryTree({ nodes, actions }: { nodes: CategoryTreeNode[]; actions: TreeActions }) {
  return (
    <ul aria-label="Categories">
      {nodes.map((n, i) => (
        <Node key={n.id} node={n} depth={0} siblings={nodes} index={i} actions={actions} />
      ))}
    </ul>
  );
}

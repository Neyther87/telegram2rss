import { hasChildren, isCDATA, isText } from 'domutils';
import { AnyNode } from 'domhandler';
import { ElementType } from 'htmlparser2';

export function innerTextEx(node: AnyNode | AnyNode[], separator: string): string {
  if (Array.isArray(node))
    return node
      .map(n => innerTextEx(n, separator))
      .filter(t => !!t)
      .join(separator);
  if (hasChildren(node) && (node.type === ElementType.Tag || isCDATA(node))) {
    return innerTextEx(node.children, separator);
  }
  if (isText(node)) return node.data.trim();
  return '';
}

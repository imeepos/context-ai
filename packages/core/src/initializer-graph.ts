export type InitializerFn = () => Promise<void> | void;

export interface InitializerNode {
  token: any;
  fn: InitializerFn;
  dependencies: Set<any>;
}

export class InitializerGraph {
  private nodes = new Map<any, InitializerNode>();

  addNode(token: any, fn: InitializerFn, options: { dependencies: Set<any> }): void {
    this.nodes.set(token, { token, fn, dependencies: options.dependencies });
  }

  topologicalSort(): InitializerNode[] {
    const sorted: InitializerNode[] = [];
    const visited = new Set<any>();
    const visiting = new Set<any>();
    const nodeArray = Array.from(this.nodes.values());

    const visit = (node: InitializerNode, path: any[]): void => {
      if (visited.has(node.token)) return;

      if (visiting.has(node.token)) {
        const cycle = [...path, node.token].map(t => this.tokenToString(t)).join(' -> ');
        throw new Error(`检测到初始化器循环依赖: ${cycle}`);
      }

      visiting.add(node.token);
      path.push(node.token);

      for (const depToken of node.dependencies) {
        const depNode = this.findNodeByDependency(depToken);
        if (depNode) {
          visit(depNode, [...path]);
        }
      }

      visiting.delete(node.token);
      path.pop();
      visited.add(node.token);
      sorted.push(node);
    };

    for (const node of nodeArray) {
      if (!visited.has(node.token)) {
        visit(node, []);
      }
    }

    return sorted;
  }

  async execute(): Promise<void> {
    const sorted = this.topologicalSort();

    for (const node of sorted) {
      try {
        await node.fn();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const tokenStr = this.tokenToString(node.token);
        throw new Error(
          `初始化器执行失败 [${tokenStr}]: ${errorMsg}`
        );
      }
    }
  }

  private findNodeByDependency(depToken: any): InitializerNode | undefined {
    for (const node of this.nodes.values()) {
      if (this.tokensMatch(node.token, depToken)) {
        return node;
      }
    }
    return undefined;
  }

  private tokensMatch(token1: any, token2: any): boolean {
    if (token1 === token2) return true;
    if (token1?.constructor === token2?.constructor) return true;
    return false;
  }

  private tokenToString(token: any): string {
    if (token?.toString && token.toString !== Object.prototype.toString) {
      return token.toString();
    }
    if (typeof token === 'function') {
      return token.name || 'AnonymousToken';
    }
    return String(token);
  }
}

import type { StructuredToolInterface } from "@langchain/core/tools";

/**
 * Agent SDK — lightweight abstraction over LangGraph.
 *
 * SDK vs Framework comparison:
 * - LangGraph (framework): you define nodes, edges, state schema, checkpointing.
 * - Agent SDK (this layer): you define agents with tools, lifecycle, and handoffs.
 *   The SDK orchestrates framework calls behind a simpler API.
 *
 * Known LangGraph flaws this SDK mitigates:
 * - Steep learning curve for simple agent flows → SDK provides create/run/handoff.
 * - Boilerplate for tool registration → SDK auto-binds tools.
 * - No built-in agent lifecycle → SDK tracks idle/running/completed/failed.
 * - Handoff patterns require manual graph wiring → SDK exposes handoff() directly.
 */

export type AgentStatus = "idle" | "running" | "completed" | "failed";

export interface AgentConfig {
  name: string;
  role: string;
  tools?: StructuredToolInterface[];
}

export interface AgentRunInput {
  query: string;
  context?: Record<string, unknown>;
}

export interface AgentRunResult {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  output: string;
  handoffTo?: string;
}

export class Agent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly tools: StructuredToolInterface[];
  status: AgentStatus = "idle";
  private handoffTarget: Agent | null = null;

  private constructor(id: string, config: AgentConfig) {
    this.id = id;
    this.name = config.name;
    this.role = config.role;
    this.tools = config.tools ?? [];
  }

  static create(config: AgentConfig): Agent {
    const id = `${config.name}-${Date.now()}`;
    return new Agent(id, config);
  }

  /** Register another agent as a handoff target (Agent-as-a-Tool pattern). */
  handoff(target: Agent): void {
    this.handoffTarget = target;
  }

  getHandoffTarget(): Agent | null {
    return this.handoffTarget;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    this.status = "running";
    try {
      const toolOutput = await this.executeTools(input);
      this.status = "completed";
      return {
        agentId: this.id,
        agentName: this.name,
        status: this.status,
        output: toolOutput,
        handoffTo: this.handoffTarget?.name,
      };
    } catch (err: any) {
      this.status = "failed";
      return {
        agentId: this.id,
        agentName: this.name,
        status: this.status,
        output: `Agent failed: ${err.message}`,
      };
    }
  }

  private async executeTools(input: AgentRunInput): Promise<string> {
    if (this.tools.length === 0) {
      return `[${this.name}] processed: ${input.query}`;
    }
    const tool = this.tools[0];
    return tool.invoke({ query: input.query });
  }

  dispose(): void {
    this.status = "idle";
    this.handoffTarget = null;
  }
}

export class AgentSDK {
  private agents = new Map<string, Agent>();

  create(config: AgentConfig): Agent {
    const agent = Agent.create(config);
    this.agents.set(agent.id, agent);
    return agent;
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  list(): Agent[] {
    return [...this.agents.values()];
  }

  disposeAll(): void {
    for (const agent of this.agents.values()) agent.dispose();
    this.agents.clear();
  }
}

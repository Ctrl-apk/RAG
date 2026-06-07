import type { Agent, AgentStatus } from "./sdk.js";

/**
 * Agent lifecycle management: create → run → handoff → complete → dispose.
 * Tracks state transitions for observability.
 */

export interface LifecycleEvent {
  agentId: string;
  agentName: string;
  from: AgentStatus;
  to: AgentStatus;
  timestamp: number;
  detail?: string;
}

export class LifecycleManager {
  private events: LifecycleEvent[] = [];

  record(agent: Agent, from: AgentStatus, to: AgentStatus, detail?: string) {
    this.events.push({
      agentId: agent.id,
      agentName: agent.name,
      from,
      to,
      timestamp: Date.now(),
      detail,
    });
    agent.status = to;
  }

  getEvents(): LifecycleEvent[] {
    return [...this.events];
  }

  getTimeline(): string[] {
    return this.events.map(
      (e) => `${e.agentName}: ${e.from} → ${e.to}${e.detail ? ` (${e.detail})` : ""}`
    );
  }

  clear() {
    this.events = [];
  }
}

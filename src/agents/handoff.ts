import { Agent, type AgentRunInput, type AgentRunResult } from "./sdk.js";
import { LifecycleManager } from "./lifecycle.js";

/**
 * Handoff / Agent-as-a-Tool pattern:
 * Agent A completes its task and delegates to Agent B, passing context forward.
 */

export interface HandoffChainResult {
  results: AgentRunResult[];
  lifecycle: string[];
  finalOutput: string;
}

export async function executeHandoffChain(
  agents: Agent[],
  input: AgentRunInput,
  lifecycle: LifecycleManager
): Promise<HandoffChainResult> {
  const results: AgentRunResult[] = [];
  let currentInput = { ...input };

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const prevStatus = agent.status;

    lifecycle.record(agent, prevStatus, "running", `step ${i + 1}/${agents.length}`);
    const result = await agent.run(currentInput);
    results.push(result);

    lifecycle.record(
      agent,
      "running",
      result.status,
      result.handoffTo ? `handoff → ${result.handoffTo}` : "done"
    );

    currentInput = {
      query: input.query,
      context: { ...currentInput.context, [`${agent.name}_output`]: result.output },
    };

    const next = agent.getHandoffTarget();
    if (next && !agents.includes(next)) {
      agents.splice(i + 1, 0, next);
    }
  }

  const final = results[results.length - 1];
  return {
    results,
    lifecycle: lifecycle.getTimeline(),
    finalOutput: final?.output ?? "",
  };
}

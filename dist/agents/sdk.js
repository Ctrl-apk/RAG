export class Agent {
    id;
    name;
    role;
    tools;
    status = "idle";
    handoffTarget = null;
    constructor(id, config) {
        this.id = id;
        this.name = config.name;
        this.role = config.role;
        this.tools = config.tools ?? [];
    }
    static create(config) {
        const id = `${config.name}-${Date.now()}`;
        return new Agent(id, config);
    }
    /** Register another agent as a handoff target (Agent-as-a-Tool pattern). */
    handoff(target) {
        this.handoffTarget = target;
    }
    getHandoffTarget() {
        return this.handoffTarget;
    }
    async run(input) {
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
        }
        catch (err) {
            this.status = "failed";
            return {
                agentId: this.id,
                agentName: this.name,
                status: this.status,
                output: `Agent failed: ${err.message}`,
            };
        }
    }
    async executeTools(input) {
        if (this.tools.length === 0) {
            return `[${this.name}] processed: ${input.query}`;
        }
        const tool = this.tools[0];
        return tool.invoke({ query: input.query });
    }
    dispose() {
        this.status = "idle";
        this.handoffTarget = null;
    }
}
export class AgentSDK {
    agents = new Map();
    create(config) {
        const agent = Agent.create(config);
        this.agents.set(agent.id, agent);
        return agent;
    }
    get(id) {
        return this.agents.get(id);
    }
    list() {
        return [...this.agents.values()];
    }
    disposeAll() {
        for (const agent of this.agents.values())
            agent.dispose();
        this.agents.clear();
    }
}

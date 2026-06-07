export class LifecycleManager {
    events = [];
    record(agent, from, to, detail) {
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
    getEvents() {
        return [...this.events];
    }
    getTimeline() {
        return this.events.map((e) => `${e.agentName}: ${e.from} → ${e.to}${e.detail ? ` (${e.detail})` : ""}`);
    }
    clear() {
        this.events = [];
    }
}

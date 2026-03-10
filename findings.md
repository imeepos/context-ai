# Findings: EventBus and ActionExecuter Issues

## Critical Bug #1: EventBus Wildcard Subscription Overwrite

**Location:** `packages/os-v1/src/core/event-bus.ts:71`

```typescript
this.wildcardHandlers.set(topic, wrappedHandler);
```

**Problem:**
- Map.set() overwrites the previous value
- Only ONE handler can exist per wildcard pattern
- Multiple calls to `subscribe("scheduler.*", handler)` will only keep the LAST handler

**Evidence from main.ts:**
```typescript
// Line 27: First subscription
eventBus.subscribe("scheduler.action.succeeded", (payload) => { ... })

// Line 50: Second subscription
eventBus.subscribe("scheduler.action.failed", (payload) => { ... })
```

These are different topics, so they work. But if you called:
```typescript
eventBus.subscribe("scheduler.*", handler1)
eventBus.subscribe("scheduler.*", handler2)  // OVERWRITES handler1!
```

**Impact:**
- High severity for wildcard patterns
- Normal topics (without *) work correctly via EventEmitter.on()
- Affects any code using wildcard subscriptions

## Critical Bug #2: ActionExecuter Execution Opacity

**Location:** `packages/os-v1/src/action-executer.ts:131-164`

**Problem:**
- execute() method is a black box
- No way to observe:
  - When execution starts
  - Progress during execution
  - Intermediate results
  - Completion status
- External code must wait for Promise resolution

**Current Flow:**
```
execute() called → [OPAQUE] → Promise resolves
```

**Desired Flow:**
```
execute() called → START event → PROGRESS events → COMPLETE/ERROR event
```

**Impact:**
- Cannot build progress UIs
- Cannot cancel long-running actions
- Cannot monitor execution health
- Difficult to debug action chains

## Root Cause Analysis

Both issues stem from the same architectural problem:
- **EventBus**: Using Map instead of multi-subscriber pattern
- **ActionExecuter**: No event emission architecture

## Solution: RxJS Integration

RxJS provides:
1. **Subject**: Multi-subscriber event streams
2. **Observable**: Reactive data flow
3. **Operators**: Transform, filter, combine streams
4. **Backpressure**: Handle fast producers

### EventBus Fix
```typescript
private readonly subjects = new Map<string, Subject<unknown>>();

subscribe(topic: string, handler: (payload: unknown) => void): () => void {
  if (!this.subjects.has(topic)) {
    this.subjects.set(topic, new Subject());
  }

  const subscription = this.subjects.get(topic)!.subscribe(handler);
  return () => subscription.unsubscribe();
}
```

### ActionExecuter Fix
```typescript
async execute(...): Promise<...> {
  this.eventBus.publish('action.started', { token, params });

  try {
    const result = await action.execute(params, injector);
    this.eventBus.publish('action.completed', { token, result });
    return result;
  } catch (error) {
    this.eventBus.publish('action.failed', { token, error });
    throw error;
  }
}
```

## Testing Strategy

### EventBus Tests
- Multiple subscriptions to same topic
- Multiple subscriptions to same wildcard pattern
- Verify all handlers receive events
- Verify unsubscribe works correctly

### ActionExecuter Tests
- Subscribe to execution events
- Verify event order: started → completed/failed
- Verify event payloads contain correct data
- Test with successful and failing actions

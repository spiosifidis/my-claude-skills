# Model Selection

The Context Governor recommends optimal models based on task requirements, context size, and cost considerations.

## Model Capability Matrix

| Model                       | Context Window | Tier     | Best For                         |
| --------------------------- | -------------- | -------- | -------------------------------- |
| claude-opus-5               | 1M             | premium  | Complex reasoning, nuanced tasks |
| claude-sonnet-5             | 1M             | standard | Balanced performance/cost        |
| claude-haiku-4-5-20251001   | 200K           | economy  | Fast, simple tasks               |

Other providers' flagship and mini tiers can be slotted into the same premium/economy tiers if your stack is multi-provider.

## Selection Algorithm

### Step 1: Check Context Fit

```
if total_tokens > model.context_window:
    → Upgrade to larger model OR prune context
```

### Step 2: Match Capabilities to Intent

| Intent          | Minimum Tier | Recommended  |
| --------------- | ------------ | ------------ |
| code_generation | standard     | sonnet       |
| debugging       | standard     | sonnet       |
| explanation     | economy      | haiku/sonnet |
| search          | economy      | haiku        |
| planning        | standard     | sonnet       |
| review          | standard     | sonnet       |

### Step 3: Apply Cost Preference

If `prefer_cost_savings` is enabled:

- Try to downgrade while maintaining capability requirements
- Calculate estimated savings

### Step 4: Generate Recommendation

```json
{
  "recommended_model": "claude-sonnet-5",
  "original_model": "claude-opus-5",
  "reason": "Task requirements met by sonnet, 80% cost savings",
  "capability_match": true,
  "cost_savings_estimate": 0.8
}
```

## Intent-Capability Mapping

### Code Generation

- **Required**: Strong coding ability
- **Recommended**: claude-sonnet-5
- **Acceptable**: claude-haiku-4-5-20251001 (simple tasks)

### Debugging

- **Required**: Code understanding, reasoning
- **Recommended**: claude-sonnet-5
- **Upgrade to**: claude-opus-5 (complex bugs)

### Explanation

- **Required**: Clear communication
- **Recommended**: claude-haiku-4-5-20251001 (Haiku 4.5), claude-sonnet-5
- **Notes**: Lower tier often sufficient

### Complex Reasoning

- **Required**: Advanced reasoning
- **Recommended**: claude-opus-5
- **Notes**: Don't downgrade for cost

## Configuration

Override model selection behavior:

```json
{
  "model_selection": {
    "enabled": true,
    "prefer_cost_savings": true,
    "capability_threshold": 0.8,
    "allowed_models": ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"],
    "default_model": "claude-sonnet-5"
  }
}
```

## Cost Estimation

Approximate relative cost per input token (check current provider pricing before relying on exact figures):

| Model                     | Relative Cost                        |
| ------------------------- | ------------------------------------ |
| claude-opus-5             | Premium tier (baseline)              |
| claude-sonnet-5           | ~40-60% of premium tier              |
| claude-haiku-4-5-20251001 | ~5x cheaper than the premium tier    |

Cost savings calculation:

```
savings = 1 - (recommended_cost / original_cost)
```

## Usage in Plans

The execution plan includes model recommendations:

```json
{
  "recommendations": {
    "model": {
      "recommended": "claude-sonnet-5",
      "original": "claude-opus-5",
      "reason": "Task complexity allows standard tier",
      "cost_savings_estimate": 0.8,
      "alternatives": ["claude-opus-5"],
      "warnings": []
    }
  }
}
```

## Manual Override

Force a specific model:

```bash
python scripts/plan.py --budget 8000 --model claude-opus-5
```

This skips automatic selection but still validates context fits.

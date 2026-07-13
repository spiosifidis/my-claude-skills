# Portion ranges, calorie-coverage priority, and starch equivalence

## Portion ranges per food

Normal range is the default; the max column is a last resort, only when other foods in the meal genuinely can't cover the remaining calories.

| Τρόφιμο | Συνηθισμένο εύρος | Max (μόνο αν χρειάζεται κάλυψη θερμίδων) |
|---|---|---|
| Κοτόπουλο (ψητό/βραστό) | 120-160γρ | 220γρ |
| Μπιφτέκια | 120-150γρ | 170-180γρ |
| Μοσχάρι κοκκινιστό/λεμονάτο | 90-140γρ | 160γρ |
| Μακαρόνια βρασμένα | 190-220γρ | 250γρ |
| Κιμάς κοκκινιστός (με μακαρόνια) | 70-100γρ | — |
| Τσιπούρα ψητή | 200-250γρ | 280γρ |
| Σαρδέλα ψητή | 120-140γρ | 160γρ |
| Φακές | 270-350γρ | 400γρ |
| Φασολάκια | 300-350γρ | 400γρ |
| Αρακάς | 240-280γρ | 300γρ |
| Σπανακόρυζο | 270-300γρ | 350γρ |
| Ρύζι/Κινόα βρασμένη | 100-160γρ | 220γρ |
| Πατάτα ψητή | 130-180γρ | 250γρ |
| Γεμιστά ορφανά ή με κιμά | 200-250γρ | 300γρ |
| Παστίτσιο ή μουσακάς | 190-220γρ | 250γρ |

## Calorie-coverage priority (the rule most often broken)

**Always cover the remaining calories of a meal with the OTHER foods** (sides, oil, cheese) — never by pushing the main ingredient past its normal range. Only use the max column when the rest of the meal's foods genuinely can't close the gap.

⚠️ **Μακαρόνια με κιμά is a deliberate exception**: always use pasta 190-220γρ and mince 70-100γρ from the table above — do NOT compress either below range just to land the meal inside ±30 kcal of the category target. This meal is *allowed* to run noticeably higher than the other choices in its category; that's expected, not a bug.

> Past incident (Ευφραιμίδου plan, 2026-07-04): mince was shrunk to 40γρ purely to fit the ±30 kcal window. Don't repeat this — widen the meal's calories instead of shrinking the mince.

## General coverage rules

- **Σαλάτα επιλογής**: always exactly 2 cups (56 kcal), never scaled.
- **Ελαιόλαδο**: default 1 tsp per meal; raise it (e.g. 2 tsp) when calorie coverage needs it, or when the client's questionnaire specifies an amount.
- **Ομελέτα**: olive oil is always **at least 2 tsp**, regardless of calorie coverage — this is a fixed exception, not conditional.
- **Rounding**: grams always round to a whole number (never e.g. 145.5γρ). Prefer round numbers (multiples of 5/10) even if it means landing a few kcal outside ±30.
- **Cooked, drained weight**: all quantities refer to cooked, drained food — no broth, bones, or other non-edible parts.
- **Ψωμί**: 1 φέτα (30γρ) or 1.5 φέτες (45γρ) — both are acceptable standard servings.
- **Quaker νιφάδες βρώμης**: 10γρ = 1 κ.σ. (tablespoon).

## Starch/bread equivalence table

Formula: `grams_B = grams_A × (kcal_A ÷ kcal_B)` → round to the nearest 5 or 10.

Multiplier reads **row → column** (e.g. Μακ/Κριθ → Ρύζι/Κινόα = ×1.31):

| kcal/100γρ | Μακ/Κριθ (158) | Ρύζι/Κινόα (121) | Πατ.ψητή (106) | Πατ.βραστή (88) | Πλιγούρι (83) | Παξ.ολικής (350) | Παξ.λαδιού (467) | Παξ.χαρουπιού (373) | Ψωμί ολικής (260) |
|---|---|---|---|---|---|---|---|---|---|
| **Μακ/Κριθ (158)** | — | ×1.31 | ×1.49 | ×1.80 | ×1.90 | ×0.45 | ×0.34 | ×0.42 | ×0.61 |
| **Ρύζι/Κινόα (121)** | ×0.77 | — | ×1.14 | ×1.38 | ×1.46 | ×0.35 | ×0.26 | ×0.32 | ×0.47 |
| **Πατ.ψητή (106)** | ×0.67 | ×0.88 | — | ×1.20 | ×1.28 | ×0.30 | ×0.23 | ×0.28 | ×0.41 |
| **Πατ.βραστή (88)** | ×0.56 | ×0.73 | ×0.83 | — | ×1.00 | ×0.25 | ×0.19 | ×0.24 | ×0.34 |
| **Πλιγούρι (83)** | ×0.53 | ×0.69 | ×0.78 | ×1.00 | — | ×0.24 | ×0.18 | ×0.22 | ×0.32 |
| **Παξ.ολικής (350)** | ×2.22 | ×2.89 | ×3.30 | ×3.98 | ×4.22 | — | ×0.75 | ×0.94 | ×1.35 |
| **Παξ.λαδιού (467)** | ×2.96 | ×3.86 | ×4.41 | ×5.31 | ×5.63 | ×1.33 | — | ×1.25 | ×1.80 |
| **Παξ.χαρουπιού (373)** | ×2.36 | ×3.08 | ×3.52 | ×4.24 | ×4.49 | ×1.07 | ×0.80 | — | ×1.43 |
| **Ψωμί ολικής (260)** | ×1.65 | ×2.15 | ×2.45 | ×2.95 | ×3.13 | ×0.74 | ×0.56 | ×0.70 | — |

Example: 140γρ ρύζι → πατάτα ψητή = 140 × 1.14 = 160γρ.

- **Κριθαράκι βρασμένο** shares the Μακαρόνια column (158 vs 157 kcal/100γρ — negligible).
- **Κινόα βρασμένη** shares the Ρύζι column (121 vs 120 kcal/100γρ — negligible).

### Piece-based breads (not in the table above)

Wasa and Παπαδοπούλου-style φρυγανιές don't have a reliable weight-per-piece on record, so putting them in the gram-equivalence table above would be a guess. Convert directly in pieces instead:

`τεμάχια = kcal_θέλεις_να_καλύψεις ÷ kcal_ανά_τεμάχιο` → round to a whole number.

- Wasa ολικής άλεσης (ID `2997`): 40.1 kcal/τεμ.
- Φρυγανιές κλασσικές / Παπαδοπούλου Χωριάτικες (ID `79605`): 48 kcal/τεμ.

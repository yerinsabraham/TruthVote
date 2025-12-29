# TruthRank Calculation Formula

**Version:** 1.0  
**Last Updated:** December 28, 2025  
**Status:** Production

---

## Overview

TruthRank is a percentage-based progression system (0-100%) that evaluates users across multiple dimensions. **No single signal can push a user to 100% alone**. Progression requires balance across time, accuracy, consistency, and volume.

---

## Core Formula

```
Rank Percentage = (Time Score × Time Weight) + 
                  (Accuracy Score × Accuracy Weight) + 
                  (Consistency Score × Consistency Weight) + 
                  (Volume Score × Volume Weight) -
                  Inactivity Penalty

Final Percentage = min(100, max(0, Rank Percentage))
```

---

## Weights by Rank

Weights change as users progress to emphasize different skills:

| Rank         | Time | Accuracy | Consistency | Volume |
|--------------|------|----------|-------------|--------|
| Novice       | 20%  | 35%      | 15%         | 30%    |
| Amateur      | 15%  | 40%      | 20%         | 25%    |
| Analyst      | 10%  | 45%      | 25%         | 20%    |
| Professional | 10%  | 50%      | 25%         | 15%    |
| Expert       | 10%  | 55%      | 25%         | 10%    |
| Master       | 10%  | 60%      | 25%         | 5%     |

**Key Insight:** Accuracy becomes more important at higher ranks, while volume matters less.

---

## Component Calculations

### 1. Time Score (0-100)

**Purpose:** Gates progression based on account age.

**Formula:**
```
Time Score = min(100, (Days Since Signup / Next Rank Time Gate) × 100)
```

**Time Gates:**
- Novice: 0 days (no gate)
- Amateur: 30 days minimum
- Analyst: 150 days minimum
- Professional: 300 days minimum
- Expert: 480 days minimum
- Master: 730 days minimum

**Example:**
```
User has been active for 45 days, currently Novice
Next rank (Amateur) requires 30 days
Time Score = min(100, (45 / 30) × 100) = 100
```

---

### 2. Accuracy Score (0-100)

**Purpose:** Rewards correct predictions, especially contrarian ones.

**Requirements:**
- User must have at least **10 resolved predictions** before accuracy counts
- If below minimum, Accuracy Score = 0

**Formula:**
```
Raw Accuracy = (Correct Predictions / Total Resolved Predictions) × 100

Contrarian Bonus = (Contrarian Wins / Total Resolved Predictions) × 10

Boosted Accuracy = min(100, Raw Accuracy + Contrarian Bonus)

Accuracy Score = ((Boosted Accuracy - Min Accuracy) / (100 - Min Accuracy)) × 100

If Boosted Accuracy < Min Accuracy for rank: Score = 0
```

**Minimum Accuracy by Rank:**
- Novice: 50%
- Amateur: 55%
- Analyst: 60%
- Professional: 65%
- Expert: 70%
- Master: 75%

**Example:**
```
User (Amateur rank): 18 correct out of 25 resolved, 3 contrarian wins
Min Accuracy for Amateur = 55%

Raw Accuracy = (18 / 25) × 100 = 72%
Contrarian Bonus = (3 / 25) × 10 = 1.2%
Boosted Accuracy = min(100, 72 + 1.2) = 73.2%

Accuracy Score = ((73.2 - 55) / (100 - 55)) × 100 = 40.4
```

---

### 3. Consistency Score (0-100)

**Purpose:** Rewards regular participation over time.

**Definition of "Active Week":**  
User voted on at least 1 prediction during that calendar week.

**Formula:**
```
If Active Weeks >= Min Weeks × 1.5: Score = 100
If Active Weeks >= Min Weeks: Score = 85
Otherwise: Score = min(85, (Active Weeks / Min Weeks) × 85)
```

**Minimum Active Weeks by Rank:**
- Novice: 1 week
- Amateur: 3 weeks
- Analyst: 12 weeks
- Professional: 30 weeks
- Expert: 52 weeks
- Master: 80 weeks

**Example:**
```
User (Analyst rank): 18 active weeks
Min Weeks for Analyst = 12

18 >= 12 × 1.5 (18)? Yes
Consistency Score = 100
```

---

### 4. Volume Score (0-100)

**Purpose:** Rewards participation with diminishing returns after threshold.

**Formula:**
```
If Predictions >= Min Predictions × 2: Score = 100
If Predictions >= Min Predictions: Score = 85
Otherwise: Score = min(85, (Predictions / Min Predictions) × 85)
```

**Minimum Predictions by Rank:**
- Novice: 5
- Amateur: 15
- Analyst: 40
- Professional: 80
- Expert: 150
- Master: 250

**Example:**
```
User (Professional rank): 95 predictions
Min Predictions for Professional = 80

95 >= 80 × 2 (160)? No
95 >= 80? Yes
Volume Score = 85
```

---

### 5. Inactivity Penalty (0-50)

**Purpose:** Slows progress during periods of inactivity.

**Definition:** "Long inactivity" = 30+ consecutive days without any activity.

**Formula:**
```
Inactivity Penalty = min(50, Inactivity Streaks × 10)
```

Each 30-day gap = -10% from final percentage  
Maximum penalty capped at -50%

**Example:**
```
User has 2 inactivity streaks (60+ days inactive total)
Inactivity Penalty = min(50, 2 × 10) = 20

This reduces final percentage by 20 points.
```

---

## Complete Worked Example

**User Profile:**
- Rank: Amateur
- Days since signup: 50 days
- Predictions: 20 (12 correct out of 18 resolved, 2 contrarian wins)
- Active weeks: 5
- Inactivity streaks: 0

**Step 1: Time Score**
```
Next rank (Analyst) requires 150 days
Time Score = min(100, (50 / 150) × 100) = 33.3
```

**Step 2: Accuracy Score**
```
Raw Accuracy = (12 / 18) × 100 = 66.7%
Contrarian Bonus = (2 / 18) × 10 = 1.1%
Boosted Accuracy = min(100, 66.7 + 1.1) = 67.8%

Min for Amateur = 55%
Accuracy Score = ((67.8 - 55) / (100 - 55)) × 100 = 28.4
```

**Step 3: Consistency Score**
```
Active weeks = 5, Min = 3
5 >= 3? Yes
Consistency Score = 85
```

**Step 4: Volume Score**
```
Predictions = 20, Min = 15
20 >= 15? Yes
Volume Score = 85
```

**Step 5: Inactivity Penalty**
```
Inactivity Penalty = 0
```

**Final Calculation (Amateur weights: 15% time, 40% accuracy, 20% consistency, 25% volume):**
```
Rank Percentage = (33.3 × 0.15) + (28.4 × 0.40) + (85 × 0.20) + (85 × 0.25) - 0
                = 5.0 + 11.4 + 17.0 + 21.3
                = 54.7%

Final Percentage = 54.7%
```

**Result:** User is 54.7% toward Analyst rank.

---

## Edge Cases

### Case 1: Brand New User
```
Days: 1
Predictions: 0
Resolved: 0
Active weeks: 0

Time Score = 100 (Novice has no gate)
Accuracy Score = 0 (need 10 resolved predictions)
Consistency Score = 0
Volume Score = 0
Penalty = 0

Result = (100 × 0.20) + 0 + 0 + 0 = 20%
```

### Case 2: Perfect Accuracy, Zero Activity
```
Days: 200
Predictions: 11 (11 correct out of 11 resolved)
Active weeks: 2
Inactivity streaks: 1

Time Score = 100
Accuracy Score = 100
Consistency Score = low
Volume Score = low
Penalty = -10

Result = High accuracy, but consistency/volume hurt progress.
```

### Case 3: High Volume, Low Accuracy
```
Days: 180
Predictions: 200 (80 correct out of 150 resolved = 53%)
Active weeks: 20
Rank: Amateur (min accuracy 55%)

Accuracy Score = 0 (53% < 55% minimum)
Volume Score = 100
Consistency Score = 100

Result = Cannot progress without meeting accuracy threshold.
```

---

## Upgrade Requirements

**To upgrade from Rank X to Rank Y:**
1. Reach 100% in current rank
2. Meet next rank's time gate
3. Both must be true simultaneously

**Example:**
- User reaches 100% in Amateur after 20 days
- Analyst requires 150 days minimum
- User must wait 130 more days at 100% before upgrading

---

## Notes for Implementation

1. **Deterministic:** Same inputs always produce same output
2. **Reproducible:** Can be audited and verified
3. **Timezone:** All timestamps in UTC
4. **Rounding:** Final percentage rounded to 1 decimal place
5. **Capping:** Scores capped at 100, penalties capped at 50
6. **Minimum Thresholds:** Accuracy and volume have hard minimums

---

## Version History

- **v1.0 (Dec 2025):** Initial formula documented

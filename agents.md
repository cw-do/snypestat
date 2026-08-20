# Hockey Game Shift & Stats Tracker

## 1. Project Goal

Build a mobile-first hockey game tracking app that allows a parent, coach, or player to record important individual hockey statistics **live during a game with minimal interaction**.

The core design principle is:

> The user should be able to watch the hockey game, not the app.

The app must therefore prioritize:

* Very large touch targets
* One-tap event recording
* Fast shift start/end tracking
* Minimal typing during games
* Easy correction of mistakes
* Automatic calculation of derived statistics
* Simple season-long player development tracking

The first version should focus on tracking **one player at a time**.

Primary initial use case:

* Youth hockey
* Individual player tracking
* Defenseman-oriented statistics
* Parent or coach recording from the stands

---

# 2. MVP Scope

The MVP should support:

1. Player profile
2. Team and season setup
3. Create a game
4. Live game clock
5. Period tracking
6. Shift start/end tracking
7. Automatic ice-time calculation
8. Quick hockey event logging
9. Undo/edit mistakes
10. Game summary
11. Season summary
12. Persistent local storage

Do NOT initially build:

* Team-wide stat tracking
* Video analysis
* AI analysis
* Automatic player detection
* Cloud accounts
* Social features
* Complex advanced analytics
* Corsi/Fenwick/xG
* Live score feeds

These can be added later.

---

# 3. Primary App Structure

Use five main sections.

## Home

Displays:

* Current player
* Current season
* Recent games
* Season summary
* Button to start a new game

Example:

```text
JASON DO
#56 | Defense

2026-27 Season

Games       12
TOI/Game    16:34
Points      8
Blocks/G    3.1

[ START NEW GAME ]
```

---

## Live Game

This is the most important screen.

The interface must be usable while watching hockey.

The screen should emphasize:

* Period
* Game clock
* Player shift status
* Current shift timer
* Large stat buttons

Example while player is on the bench:

```text
P2                  08:34

JASON #56
DEFENSE

TOTAL TOI
10:42

SHIFTS
15

+----------------------------+
|                            |
|        START SHIFT         |
|                            |
+----------------------------+
```

When START SHIFT is tapped:

```text
P2                  08:34

JASON #56

ON ICE
SHIFT 16

00:31

[ SHOT ]        [ BLOCK ]

[ TAKEAWAY ]    [ GIVEAWAY ]

[ ZONE EXIT ]   [ BATTLE WIN ]

[ + ]           [ - ]

+----------------------------+
|          END SHIFT         |
+----------------------------+
```

The START SHIFT / END SHIFT control should be the largest control on the screen.

---

# 4. Shift Tracking

Shift tracking is the central feature of the app.

## Start Shift

When the user taps:

```text
START SHIFT
```

store:

```text
shift_start_game_time
shift_start_real_time
period
```

The UI begins displaying:

```text
ON ICE
00:01
00:02
00:03
...
```

---

## End Shift

When the user taps:

```text
END SHIFT
```

store:

```text
shift_end_game_time
shift_end_real_time
duration
```

Example:

```text
Period: 2
Start: 08:34
End: 07:48
Duration: 46 sec
```

---

# 5. Ice-Time Statistics

Automatically calculate:

```text
Total TOI
TOI per period
Number of shifts
Average shift duration
Longest shift
Shortest shift
Average bench/rest duration
```

Example summary:

```text
TOTAL TOI
16:42

SHIFTS
23

AVG SHIFT
44 sec

LONGEST
1:18

P1   5:22
P2   6:01
P3   5:19
```

---

# 6. Game Clock

The app should maintain its own hockey game clock.

Default youth hockey configuration should be customizable.

Example:

```text
Period length: 15 minutes
Periods: 3
Clock mode: countdown
```

Controls:

```text
START CLOCK
PAUSE CLOCK
RESUME CLOCK
END PERIOD
```

Game clock and shift tracking must be independent enough that the user can correct mistakes.

---

# 7. Quick Stats

The first version should prioritize events that can realistically be recorded live.

## Basic Offensive Stats

```text
Goal
Assist
Shot on Goal
```

---

## Defensive Stats

```text
Blocked Shot
Takeaway
Giveaway
Puck Breakup
Battle Won
Battle Lost
```

---

## Transition Stats

```text
Successful Zone Exit
Failed Zone Exit
Controlled Zone Entry
Outlet Pass Completed
Outlet Pass Failed
```

For MVP, some advanced stats can be disabled by default.

---

# 8. Quick Mode vs Advanced Mode

Provide two stat layouts.

## Quick Mode

Recommended default.

```text
SHOT
BLOCK
TAKEAWAY
GIVEAWAY
+
-
```

Optionally:

```text
GOAL
ASSIST
```

This mode should allow nearly all interaction with one tap.

---

## Advanced Mode

Adds:

```text
PUCK BREAKUP

ZONE EXIT +
ZONE EXIT -

ZONE ENTRY

OUTLET PASS +
OUTLET PASS -

BATTLE +
BATTLE -
```

Users should be able to configure which buttons appear.

---

# 9. Event Logging

Every event should automatically store context.

Example event object:

```json
{
  "type": "BLOCK",
  "period": 2,
  "game_time": "08:12",
  "shift_id": 16,
  "timestamp": "2026-08-14T19:34:03"
}
```

This allows future analysis such as:

```text
Shift 16
46 sec

08:18  Takeaway
08:12  Block
07:58  Successful Zone Exit
```

---

# 10. Plus / Minus

Provide large:

```text
+
-
```

buttons.

If the player's team scores while the player is on the ice:

```text
+
```

If the opponent scores:

```text
-
```

Track:

```text
Plus events
Minus events
Game +/-
Season +/-
```

Do not attempt to automatically infer plus/minus in the MVP.

---

# 11. Undo System

Mistakes will happen frequently during live tracking.

Always show:

```text
UNDO
```

Example:

```text
BLOCK RECORDED

[ UNDO ]
```

Undo should reverse the latest event.

Also maintain an event history.

Example:

```text
EVENTS

08:12 Block
07:58 Zone Exit
07:31 Giveaway
```

Each item should be editable or deletable.

---

# 12. Shift Correction

Shift timing errors must be easy to fix.

After the game, allow:

```text
Shift 12

Start   10:42
End     09:51
Duration 51 sec
```

Quick corrections:

```text
START -5s
START +5s

END -5s
END +5s
```

Also allow manual clock editing.

---

# 13. Optional Shift Rating

When a shift ends, optionally show a very small prompt:

```text
SHIFT QUALITY

[ GOOD ] [ OK ] [ POOR ]
```

This must be optional because it should not slow down live tracking.

Store:

```text
good
neutral
poor
unrated
```

Later calculate:

```text
Good Shift %
```

---

# 14. Game Creation

Before the game:

```text
NEW GAME

Opponent
Nashville Jr. Predators

Date
Aug 14, 2026

Location
Optional

Home / Away

Period Length
15:00

Number of Periods
3
```

Then:

```text
START GAME
```

---

# 15. Game Summary

After the game show:

```text
vs Nashville
W 4-2

TOI            16:42
Shifts         23
Avg Shift      44 sec

Goals          0
Assists        1
Shots          3

Blocks         4
Takeaways      3
Giveaways      1

Zone Exit      7 / 9
Exit Success   78%

Battle Won     5 / 8
Battle Win     63%

+/-            +2
```

---

# 16. Game Notes

Allow a short post-game note.

Example:

```text
Good gap control.
Strong first pass under pressure.
Need quicker decision on defensive-zone exits.
```

Do not require notes.

---

# 17. Season Dashboard

Aggregate all games.

Example:

```text
2026-27 SEASON

Games               24

Average TOI          16:31
Average Shifts       22.8
Average Shift        43 sec

Goals                3
Assists              14
Points               17

Blocks/Game          3.8
Takeaways/Game       2.3
Giveaways/Game       1.2

Zone Exit Success    78%
Battle Win Rate      63%

+/-                  +12
```

---

# 18. Development Trends

Show trends over time.

Important metrics:

```text
TOI / Game
Blocks / Game
Takeaways / Game
Giveaways / Game
Zone Exit Success %
Battle Win %
Points / Game
```

A simple line chart is enough.

Example:

```text
Zone Exit Success

Game 1      61%
Game 5      66%
Game 10     72%
Game 20     78%
```

---

# 19. Recommended Data Model

## Player

```text
id
name
jersey_number
position
shoots
team_id
```

---

## Team

```text
id
name
season
```

---

## Game

```text
id
date
opponent
home_away
location
period_length
period_count

our_score
opponent_score

notes
```

---

## Shift

```text
id
game_id
player_id

period

start_game_seconds
end_game_seconds

start_timestamp
end_timestamp

duration_seconds

rating
```

---

## Event

```text
id
game_id
shift_id
player_id

period
game_seconds

event_type

timestamp
```

Possible event types:

```text
GOAL
ASSIST
SHOT
BLOCK
TAKEAWAY
GIVEAWAY
PUCK_BREAKUP

ZONE_EXIT_SUCCESS
ZONE_EXIT_FAIL

ZONE_ENTRY

OUTLET_PASS_SUCCESS
OUTLET_PASS_FAIL

BATTLE_WIN
BATTLE_LOSS

PLUS
MINUS
```

---

# 20. Internal Time Representation

Do not store hockey clock values as strings internally.

Store game time using integer seconds.

Example:

```text
08:34 remaining
```

For a 15-minute period:

```text
514 seconds remaining
```

Display formatting can convert this to:

```text
08:34
```

This makes calculations and corrections easier.

---

# 21. Derived Statistics

Do not permanently store values that can be calculated.

Examples:

```text
total_TOI =
SUM(shift.duration)

average_shift =
total_TOI / shift_count
```

Zone exit percentage:

```text
successful_exits /
(successful_exits + failed_exits)
```

Battle win rate:

```text
battle_wins /
(battle_wins + battle_losses)
```

---

# 22. UX Principles

This app will frequently be used:

* In a cold hockey rink
* With gloves or cold hands
* While watching fast action
* With poor lighting
* While distracted

Therefore:

## Touch targets

Buttons should be very large.

Avoid small icons during live mode.

---

## Minimal navigation

During a game, ideally everything occurs on one screen.

Do not require menus for normal stat entry.

---

## High contrast

Use a dark interface with bright readable text.

Suggested visual direction:

```text
Dark navy / black background

White text

Ice blue accents

Green = on ice / success

Red = mistake / minus / failed action
```

---

# 23. Live Game Screen Priority

Visual hierarchy:

```text
1. Game clock
2. ON ICE / BENCH status
3. Shift timer
4. START / END SHIFT button
5. Quick stat buttons
6. Undo
7. Secondary information
```

Never allow secondary analytics to clutter the live screen.

---

# 24. Haptic Feedback

On mobile devices use haptic feedback where available.

Examples:

```text
Start Shift
→ medium haptic

End Shift
→ medium haptic

Stat event
→ light haptic

Delete/error
→ warning haptic
```

This helps confirm actions without requiring the user to look down.

---

# 25. Prevent Accidental Double Taps

Stat buttons should protect against accidental duplicate entries.

Possible strategy:

```text
200-400 ms input debounce
```

If the same event is tapped twice very quickly, optionally display:

```text
2 BLOCKS?

[ KEEP ] [ UNDO ONE ]
```

Do not make the live interface overly restrictive.

---

# 26. Offline First

The MVP must work without internet access.

Hockey rinks often have poor connectivity.

All live tracking functionality must work offline.

Use local persistent storage.

Potential options depending on implementation:

```text
SQLite
IndexedDB
local database
```

Cloud synchronization can be added later.

---

# 27. Mobile-First Development

Primary target:

```text
Phone portrait orientation
```

Design approximately around:

```text
390 x 844
```

but support responsive sizing.

Tablet support is desirable but secondary.

---

# 28. Future Feature: Rink Event Location

Later allow the user to tap a rink diagram after an event.

Example:

```text
SHOT
↓
tap rink location
```

Could eventually generate:

```text
Shot heat map
Takeaway heat map
Giveaway heat map
Block location map
```

Do not require rink-location entry during MVP live tracking.

---

# 29. Future Feature: Video Synchronization

Because all shifts and events have game timestamps, future versions could synchronize with game video.

Example:

```text
Shift 12
P2 10:42 → 09:51
```

Could jump directly to that section of video.

Design the time/event data model so this is possible later.

---

# 30. Future Feature: Training Ecosystem Integration

StatCam Hockey may eventually export user-selected game insights to independent training tools.

Keep the event and shift-film model portable, but do not add a vendor-specific training integration in the MVP.

---

# 31. MVP Development Order

Implement in this order.

## Phase 1 — Foundation

Build:

* App shell
* Player profile
* Team/season model
* Game model
* Local database

---

## Phase 2 — Game Clock

Build:

* Period clock
* Start
* Pause
* Resume
* End period
* Period switching

---

## Phase 3 — Shift Tracker

Build:

* Start shift
* End shift
* Shift timer
* Total TOI
* Shift count
* Average shift

This is the first major functional milestone.

---

## Phase 4 — Live Events

Add:

* Shot
* Block
* Takeaway
* Giveaway
* Plus
* Minus

Every event must be associated with:

```text
game
period
game clock
shift
```

---

## Phase 5 — Editing

Add:

* Undo
* Event history
* Delete event
* Shift timing correction

---

## Phase 6 — Game Summary

Create automatic game statistics.

---

## Phase 7 — Season Dashboard

Aggregate games and show trends.

---

# 32. First Prototype Requirement

The first working prototype does NOT need to look polished.

It should successfully perform this workflow:

```text
Create Player

↓

Create Game

↓

Start Period

↓

Start Shift

↓

Record:
BLOCK
TAKEAWAY
SHOT

↓

End Shift

↓

Start another Shift

↓

End Game

↓

Display:
Total TOI
Shift count
Average shift
Event totals
```

If this workflow is reliable, the MVP foundation is successful.

---

# 33. Important Development Rule

When deciding between:

```text
more statistics
```

and:

```text
faster/easier live interaction
```

always choose:

```text
faster/easier live interaction
```

The application's primary advantage should be that somebody can genuinely record an individual hockey player's performance **while still watching the game**.

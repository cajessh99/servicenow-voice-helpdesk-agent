# Build the "Check ticket status" conversation

This is the first of Athena's Virtual Agent conversations: a caller asks about their ticket and Athena tells them where it stands, in plain words. It follows [Flow 1 in the design](../../design/03-flows.md#flow-1-check-ticket-status).

**Time:** about 1 hour. **You'll need:** the `ClaudeClient` script include from the [Claude API setup](../setup/02-connect-claude-api.md), already working.

## How it's built

The ticket logic lives in one script include, `AthenaTickets`, rather than inside the Virtual Agent topic. The topic just calls it. Later, the voice page calls the same script, so chat and voice always say the same thing. That's worth mentioning in your portfolio write-up: *one brain, two channels*.

```
Virtual Agent topic ─┐
                     ├──> AthenaTickets ──> incident table (facts)
Voice page (later) ──┘          └────────> ClaudeClient (short labels, shorter wording)
```

---

## Part 1: Add the shared ticket logic (10 min)

1. Set the application picker (globe icon) to **Voice Helpdesk Agent**.
2. Go to `sys_script_include.list` and click **New**.
3. Fill in:
   - **Name:** `AthenaTickets`
   - **Accessible from:** This application scope only
   - **Protection policy:** Read-only
   - **Script:** delete the template, then paste all of [`servicenow-scripts/AthenaTickets.js`](../../servicenow-scripts/AthenaTickets.js)
4. Click **Submit**.

## Part 2: Create demo tickets (5 min)

Athena needs some open tickets to talk about.

1. Go to **System Definition > Scripts - Background**.
2. Set the scope dropdown to **global**. This keeps demo data out of your app, so it isn't committed to GitHub.
3. Paste all of [`servicenow-scripts/create-test-incidents.js`](../../servicenow-scripts/create-test-incidents.js) and click **Run script**.

You should see three lines like `Created INC0010043: Laptop battery drains within an hour [In Progress]`. These are logged against your own user, which is who you'll be when you test the chat.

## Part 3: Test the logic before building the topic (5 min)

Testing the script on its own first means that if something's wrong, you'll know it isn't the Designer.

1. Still in **Scripts - Background**, set the scope to **x_2244524_voice_0** this time.
2. Run:

```javascript
var athena = new x_2244524_voice_0.AthenaTickets();
var tickets = athena.getOpenIncidents(gs.getUserID(), 5);
gs.info('Open tickets: ' + tickets.length);
for (var i = 0; i < tickets.length; i++) {
    gs.info(athena.speakNumber(tickets[i].number) + ' -> ' + athena.describe(tickets[i]));
}
var options = athena.choiceOptions(gs.getUserID());
gs.info('Choices: ' + JSON.stringify(options));
```

You should see something like:

```
Open tickets: 3
INC 0 0 1, 0 0 4, 3 -> Your ticket about your laptop battery is being worked on by the Hardware team. The latest update says: Your replacement battery arrives Thursday and we'll swap it at your desk.
...
Choices: [{"value":"...","label":"Your laptop battery (INC0010043)"}, ...]
```

As before, you'll see "Security restricted ... was granted" lines the first time (reading incidents and comments). That's expected. If any line says **ERROR**, send it to me.

---

## Part 4: Build the topic in Virtual Agent Designer (30 to 40 min)

### 4.1 Create the topic

1. Make sure the application picker is set to **Voice Helpdesk Agent**.
2. In the **All** menu, search `Virtual Agent` and open **Designer**. (In newer releases this may be called **Assistant Designer**.)
3. Click **Create** (or **New Topic**) and choose to start from scratch / a blank topic.
4. **Properties:**
   - **Name:** `Check ticket status`
   - **Description:** `Tells callers where their open IT tickets stand, in plain language.`
   - **Topic discovery:** depending on your release you'll see NLU, keywords, or LLM options. If you can choose **Keywords**, use that for now and add: `ticket`, `status`, `update`, `check`, `my incident`. If it asks for example utterances, use the "Check status" phrases from the [sample dialogues](../../design/04-sample-dialogues.md#intent-test-phrasings).
5. Save.

### 4.2 Add two script variables

Open the **Variables** panel (usually a `{x}` icon on the side of the flow canvas), then under **Script variables** add:

| Name | Type |
|---|---|
| `ticket_count` | String |
| `ticket_id` | String |

### 4.3 Build the flow

Drag these nodes onto the canvas and connect them in this order. Node names matter, because Virtual Agent turns them into variable names.

```
Start
  └─ [Bot response: Text]   "Checking"
       └─ [Utility: Script action]   "Load tickets"
            └─ [Utility: Decision]   "How many"
                 ├─ None    ─> [Text] "No tickets"             ─> End
                 ├─ One     ─> [Text] "One ticket"             ─> End
                 └─ Several ─> [User input: Dynamic choice] "Which ticket"
                                  └─ [Text] "Ticket details"   ─> End
```

For every field below that holds code, click the script toggle (usually a `</>` or *Script* switch next to the field) before pasting.

**1. Text: "Checking"**
- Response message: `One moment, I'm checking.`

**2. Script action: "Load tickets"**

```javascript
(function execute() {
    var tickets = new AthenaTickets().getOpenIncidents(gs.getUserID(), 5);
    vaVars.ticket_count = String(tickets.length);
    vaVars.ticket_id = tickets.length ? tickets[0].sys_id : '';
})()
```

**3. Decision: "How many"**, with three branches:

| Branch name | Condition script |
|---|---|
| None | `(function execute() { return vaVars.ticket_count == '0'; })()` |
| One | `(function execute() { return vaVars.ticket_count == '1'; })()` |
| Several | `(function execute() { return Number(vaVars.ticket_count) > 1; })()` |

**4. Text: "No tickets"** (None branch)
- Response message: `You don't have any open tickets right now. If something's not working, just say "report a problem".`

**5. Text: "One ticket"** (One branch), as a script:

```javascript
(function execute() {
    var athena = new AthenaTickets();
    var ticket = athena.getIncident(vaVars.ticket_id, gs.getUserID());
    return ticket ? athena.describe(ticket) : "Sorry, I couldn't open that ticket just now.";
})()
```

**6. Dynamic choice: "Which ticket"** (Several branch)
- **Prompt**, as a script:

```javascript
(function execute() {
    return 'You have ' + vaVars.ticket_count + ' open tickets. Which one?';
})()
```

- **Populate choices by:** Script
- **Script:**

```javascript
(function execute() {
    return new AthenaTickets().choiceOptions(gs.getUserID());
})()
```

**7. Text: "Ticket details"**, as a script:

```javascript
(function execute() {
    var athena = new AthenaTickets();
    var ticket = athena.getIncident(vaInputs.which_ticket.getValue(), gs.getUserID());
    return ticket ? athena.describe(ticket) : "Sorry, I couldn't open that ticket just now.";
})()
```

`vaInputs.which_ticket` comes from the node name "Which ticket" (lowercase, spaces become underscores). If you name the node differently, change this line to match.

Save the topic.

### 4.4 Test in the Designer

1. Click **Test** (top right of the Designer).
2. Type `check my ticket`.
3. Athena should say "One moment, I'm checking.", then list your three tickets. Pick one and check the description reads naturally.

Things to try, from the [design's error handling](../../design/03-flows.md#error-handling):
- Pick each of the three tickets. Each state (In Progress, On Hold, New) should read differently.
- Resolve two of the demo tickets, test again, and check that the "One ticket" branch kicks in.

### 4.5 Publish and commit

1. In the Designer, click **Activate** or **Publish**, so the topic can be used outside the test window.
2. In Studio: **Source control > Commit changes**, with the message `Add Check ticket status topic and AthenaTickets`. Leave "include changes not tracked" unticked.

---

## Notes on choices made

- **Chat shows a list; voice will read up to three.** The design says that with more than three tickets Athena should ask for a number or description. In chat, a tappable list is easier, so the topic uses one for any count above one. The voice page will apply the "more than three" rule when we build it.
- **Facts come from the record, wording from Claude.** `describe()` builds the status sentence from incident fields. Claude only shortens the latest comment and makes the "your laptop battery" labels, with instructions not to add facts. If Claude is unavailable, Athena falls back to the raw text instead of failing.
- **Caller-visible comments only.** Athena reads *Additional comments*, never internal *Work notes*.
- **Only the caller's own tickets.** `getIncident()` checks the caller before returning anything, so a crafted choice value can't expose someone else's ticket.

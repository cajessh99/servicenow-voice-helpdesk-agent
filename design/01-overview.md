# IT Help Desk Voice Agent: Design Overview

## The problem

Employees call the IT help desk for a small set of repetitive requests: "What's happening with my ticket?" and "Something's broken, can you log it?" These calls are short and predictable, but they still queue behind complex issues. A voice agent can resolve them end to end and hand everything else to a person with full context, so nobody has to repeat themselves.

## What the agent does (v1 scope)

| Intent | What the caller wants | What the agent does in ServiceNow |
|---|---|---|
| **Check ticket status** | "Any update on my laptop ticket?" | Looks up the caller's open incidents, reads back state, assignment group and latest work note |
| **Report a new issue** | "My VPN keeps dropping." | Gathers a description, impact and urgency, creates an incident, reads back the number |
| **Talk to a person** | "Can I speak to someone?" | Summarises the conversation and hands off with the transcript attached |
| **Fallback** | Anything out of scope | Explains what it can help with, offers handoff |

### Out of scope for v1 (named on purpose)

- **Password resets.** These need real identity verification, which is a security design problem in its own right. Listed as a v2 idea in the write-up.
- **Changing or closing tickets.** Read and create only, so the agent can't do damage.
- **Phone calls.** v1 runs in the browser. Twilio phone support is a stretch goal.

## Who the caller is

In the demo, the caller is the user signed in to the PDI, so the agent already knows who they are. This keeps the demo honest: it never asks for a name it could guess, and never reads out someone else's tickets.

## How the pieces split the work

- **ServiceNow Virtual Agent** owns the conversation structure: which flow runs, what data is collected, and every read or write to the incident table.
- **Claude** handles language: working out what the caller wants from free speech, pulling details out of a rambling description, and writing a clean ticket summary. Claude never invents ticket data. Anything it says about a ticket comes from a ServiceNow record passed to it.
- **The browser voice page** turns speech into text and text into speech.

This split is a design choice worth explaining in the portfolio: deterministic systems for actions, the language model for understanding.

## How we'll know it works

| Measure | Target for the demo | How to check |
|---|---|---|
| Intent recognised on first try | 9 of 10 test phrasings per intent | Scripted test utterances (see sample dialogues) |
| Ticket created with a usable summary | Short description under 80 characters, correct category | Review created records |
| Caller never repeats themselves after handoff | Transcript and summary attached every time | Inspect the handoff record |
| Recovers from mishearing | Gets back on track within 2 turns | Error-handling test cases |

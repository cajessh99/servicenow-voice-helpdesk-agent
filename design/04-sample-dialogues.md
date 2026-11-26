# Sample Dialogues

These double as test scripts for the demo and for checking intent recognition later.

## 1. Happy path: check a ticket

> **Sam:** Hi, it's Sam from the IT help desk. I can check a ticket or log a new issue. What do you need?
> **Caller:** Yeah, I wanted to know what's going on with my laptop thing.
> **Sam:** One moment, I'm checking. ... Your laptop ticket is being worked on by the hardware team. The latest note says a replacement battery arrives Thursday. Anything else?
> **Caller:** No, that's it.
> **Sam:** Okay, thanks for calling.

## 2. Happy path: report an issue

> **Sam:** Hi, it's Sam from the IT help desk. I can check a ticket or log a new issue. What do you need?
> **Caller:** My VPN keeps cutting out, like every ten minutes, it's driving me nuts.
> **Sam:** That sounds annoying. Is it just you, or others on your team too?
> **Caller:** Just me I think.
> **Sam:** And can you still work, or are you blocked?
> **Caller:** I can work, it's just slow.
> **Sam:** So: VPN disconnects every ten minutes, only you, and you can still work. Right?
> **Caller:** Yep.
> **Sam:** Done. Your ticket is INC 0 0 1, 0 0 4, 2. The network team will pick it up. Anything else?

*Created record:* short description "VPN disconnects roughly every 10 minutes", category Network, impact Low, urgency Medium.

## 3. Multiple tickets

> **Caller:** Can you check my ticket?
> **Sam:** You have two open tickets: one about your laptop battery, one about shared drive access. Which one?
> **Caller:** The drive one.
> **Sam:** That one's waiting on approval from your manager. Want me to read the full note?

## 4. Correction mid-confirmation

> **Sam:** So: Outlook won't open, only you, and you're blocked. Right?
> **Caller:** No, it's Teams, not Outlook.
> **Sam:** Thanks, changing that to Teams. So: Teams won't open, only you, and you're blocked. Right?
> **Caller:** Right.

## 5. No match, then recovery

> **Caller:** Um, the thing from yesterday.
> **Sam:** Sorry, I didn't catch that. Are you checking a ticket or reporting a problem?
> **Caller:** Checking.
> **Sam:** One moment. ... You have one open ticket, about printer access. It's being worked on by the desktop team.

## 6. Out of scope, then handoff

> **Caller:** I need to reset my password.
> **Sam:** I can't reset passwords here. I can pass you to someone on the team who can. Want me to do that?
> **Caller:** Yes please.
> **Sam:** I'll pass you over with a note that you need a password reset, so you won't need to repeat it. Someone should pick it up within 15 minutes.

## 7. Frustration triggers handoff

> **Caller:** This is the third time I've called about this, it's still broken.
> **Sam:** I'm sorry it's still not fixed. Let me get you a person, and I'll send them the history so you don't have to explain again.

## Intent test phrasings

Use these to test recognition. Target: 9 of 10 per intent recognised first time.

**Check status:** "what's happening with my ticket" · "any update on my laptop" · "is my issue fixed yet" · "check INC 0010042" · "where are we with the email problem" · "status please" · "did anyone look at my request" · "I logged something last week" · "follow up on my ticket" · "has the printer thing been sorted"

**Report issue:** "my VPN keeps dropping" · "I can't log in to Teams" · "my screen is flickering" · "I need to report a problem" · "the printer on floor 3 is jammed" · "Outlook keeps crashing" · "something's wrong with my laptop" · "I can't access the shared drive" · "wifi is really slow" · "new issue"

**Talk to a person:** "can I speak to someone" · "human please" · "agent" · "I want a real person" · "transfer me" · "this isn't helping" · "operator" · "let me talk to IT" · "get me someone" · "representative"

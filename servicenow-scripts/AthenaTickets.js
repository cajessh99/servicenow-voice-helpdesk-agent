/**
 * AthenaTickets: shared ticket logic for Athena.
 *
 * Used by the Virtual Agent topics (text chat) and later by the voice page,
 * so both channels say exactly the same thing.
 *
 * Design rules (see design/03-flows.md):
 *  - Facts about a ticket come only from the ServiceNow record. Claude is used
 *    to shorten and label text, never to invent status details.
 *  - Everything Athena says is short and written for the ear.
 *  - If Claude is unavailable, fall back to plain record fields.
 *
 * Script include settings:
 *   Name: AthenaTickets
 *   Accessible from: This application scope only
 */
var AthenaTickets = Class.create();
AthenaTickets.prototype = {
    initialize: function () {
        this.claude = new ClaudeClient();
    },

    /** The caller's open incidents, most recently updated first. */
    getOpenIncidents: function (userId, limit) {
        var tickets = [];
        var gr = new GlideRecord('incident');
        gr.addQuery('caller_id', userId);
        gr.addActiveQuery();
        gr.orderByDesc('sys_updated_on');
        gr.setLimit(limit || 5);
        gr.query();
        while (gr.next()) {
            tickets.push(this._toTicket(gr));
        }
        return tickets;
    },

    /** One incident by sys_id, only if it belongs to this caller. */
    getIncident: function (sysId, userId) {
        var gr = new GlideRecord('incident');
        if (!gr.get(sysId)) return null;
        if (userId && gr.getValue('caller_id') !== userId) return null;
        return this._toTicket(gr);
    },

    /**
     * Choices for a Virtual Agent Dynamic Choice input:
     * [{value: sys_id, label: 'Laptop battery (INC0010042)'}]
     */
    choiceOptions: function (userId) {
        var tickets = this.getOpenIncidents(userId, 5);
        var labels = this.shortLabels(tickets);
        var options = [];
        for (var i = 0; i < tickets.length; i++) {
            options.push({
                value: tickets[i].sys_id,
                label: this._capitalise(labels[i]) + ' (' + tickets[i].number + ')'
            });
        }
        return options;
    },

    /** What Athena says about one ticket. */
    describe: function (ticket) {
        var label = this.shortLabels([ticket])[0];
        var text = 'Your ticket about ' + label + ' is ' + this.stateInWords(ticket) + '.';
        if (ticket.latest_update) {
            text += ' The latest update says: ' + this.shortenUpdate(ticket.latest_update);
        }
        return text;
    },

    /** Plain-language ticket state, per the flow design. */
    stateInWords: function (ticket) {
        switch (String(ticket.state)) {
            case '1':
                return 'logged and waiting to be picked up';
            case '2':
                return ticket.team ? 'being worked on by the ' + ticket.team + ' team' : 'being worked on';
            case '3':
                return 'on hold while the team waits on something';
            case '6':
                return 'marked as resolved';
            default:
                return ticket.state_label ? ticket.state_label.toLowerCase() : 'open';
        }
    },

    /** "INC0010042" -> "INC 0 0 1, 0 0 4, 2" for text-to-speech. */
    speakNumber: function (number) {
        var match = /^([A-Za-z]+)(\d+)$/.exec(number || '');
        if (!match) return number;
        var digits = match[2].split('');
        var groups = [];
        for (var i = 0; i < digits.length; i += 3) {
            groups.push(digits.slice(i, i + 3).join(' '));
        }
        return match[1] + ' ' + groups.join(', ');
    },

    /**
     * Two-to-four word labels like "your laptop battery" for each ticket,
     * in one Claude call. Falls back to the short description.
     */
    shortLabels: function (tickets) {
        var fallback = [];
        for (var i = 0; i < tickets.length; i++) {
            fallback.push((tickets[i].short_description || tickets[i].number).toLowerCase());
        }
        if (tickets.length === 0) return fallback;

        var lines = [];
        for (var j = 0; j < tickets.length; j++) {
            lines.push((j + 1) + '. ' + tickets[j].short_description);
        }
        var result = this.claude.send(
            'You label IT tickets for a voice assistant. For each ticket description, ' +
            'write a 2 to 4 word lowercase label a person would say out loud, such as ' +
            '"your laptop battery" or "shared drive access". Use only words supported by ' +
            'the description. Return labels in the same order.',
            [{ role: 'user', content: lines.join('\n') }],
            {
                type: 'object',
                properties: { labels: { type: 'array', items: { type: 'string' } } },
                required: ['labels'],
                additionalProperties: false
            }
        );
        if (!result.ok || !result.data || result.data.labels.length !== tickets.length) {
            return fallback;
        }
        return result.data.labels;
    },

    /** Shorten a work update to one spoken sentence without adding facts. */
    shortenUpdate: function (update) {
        var result = this.claude.send(
            'Rewrite this IT ticket update as one short spoken sentence under 20 words, ' +
            'addressed to the person who raised the ticket. Keep every fact (dates, ' +
            'names, next steps) and add nothing that is not in the update. Reply with ' +
            'the sentence only.',
            [{ role: 'user', content: update }]
        );
        return result.ok ? result.text.trim() : update;
    },

    _toTicket: function (gr) {
        return {
            sys_id: gr.getUniqueValue(),
            number: gr.getValue('number'),
            short_description: gr.getValue('short_description') || '',
            state: gr.getValue('state'),
            state_label: gr.getDisplayValue('state'),
            team: gr.getDisplayValue('assignment_group') || '',
            latest_update: this._latestComment(gr.getUniqueValue())
        };
    },

    /** Newest caller-visible comment (not internal work notes). */
    _latestComment: function (incidentSysId) {
        var j = new GlideRecord('sys_journal_field');
        j.addQuery('name', 'incident');
        j.addQuery('element_id', incidentSysId);
        j.addQuery('element', 'comments');
        j.orderByDesc('sys_created_on');
        j.setLimit(1);
        j.query();
        return j.next() ? j.getValue('value') : '';
    },

    _capitalise: function (text) {
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    },

    type: 'AthenaTickets'
};

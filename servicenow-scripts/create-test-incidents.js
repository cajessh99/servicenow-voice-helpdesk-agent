/**
 * Creates three demo incidents for the signed-in user, so Athena has
 * something to talk about. Run in Scripts - Background with the scope set
 * to **global** (not the Voice Helpdesk Agent app), so the demo data is
 * not captured in the app or committed to GitHub.
 *
 * Safe to run more than once: it skips tickets that already exist.
 */
(function () {
    var me = gs.getUserID();

    var demo = [
        {
            short_description: 'Laptop battery drains within an hour',
            category: 'hardware',
            group: 'Hardware',
            state: 2, // In Progress
            comment: 'Replacement battery ordered. It should arrive Thursday and we will swap it at your desk.'
        },
        {
            short_description: 'Cannot access the Finance shared drive',
            category: 'software',
            group: 'Service Desk',
            state: 3, // On Hold
            hold_reason: 1, // Awaiting Caller
            comment: 'Waiting for your manager to approve access to the Finance drive.'
        },
        {
            short_description: 'Printer on floor 3 keeps jamming',
            category: 'hardware',
            group: '',
            state: 1, // New
            comment: ''
        }
    ];

    for (var i = 0; i < demo.length; i++) {
        var d = demo[i];

        var existing = new GlideRecord('incident');
        existing.addQuery('caller_id', me);
        existing.addQuery('short_description', d.short_description);
        existing.addActiveQuery();
        existing.query();
        if (existing.next()) {
            gs.info('Already exists: ' + existing.getValue('number') + ' ' + d.short_description);
            continue;
        }

        var inc = new GlideRecord('incident');
        inc.initialize();
        inc.setValue('caller_id', me);
        inc.setValue('short_description', d.short_description);
        inc.setValue('category', d.category);
        inc.setValue('impact', 3);
        inc.setValue('urgency', 3);
        if (d.group) {
            var grp = new GlideRecord('sys_user_group');
            if (grp.get('name', d.group)) {
                inc.setValue('assignment_group', grp.getUniqueValue());
            }
        }
        var id = inc.insert();

        // Move it to the target state and add a caller-visible comment.
        inc.get(id);
        inc.setValue('state', d.state);
        if (d.hold_reason) inc.setValue('hold_reason', d.hold_reason);
        if (d.comment) inc.comments = d.comment;
        inc.update();

        gs.info('Created ' + inc.getValue('number') + ': ' + d.short_description +
            ' [' + inc.getDisplayValue('state') + ']');
    }
})();

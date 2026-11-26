var ClaudeClient = Class.create();
ClaudeClient.prototype = {
    initialize: function () {
        this.endpoint = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-opus-5-5';
    },

    /**
     * Send one request to Claude.
     * @param {string} system   Instructions for Claude (Athena's persona and rules).
     * @param {Array}  messages [{role: 'user'|'assistant', content: '...'}]
     * @param {Object} [schema] Optional JSON schema; when given, the reply is parsed JSON.
     * @returns {{ok: boolean, text: string, data: Object, error: string}}
     */
    send: function (system, messages, schema) {
        var body = {
            model: this.model,
            max_tokens: 1024,
            system: system,
            messages: messages,
            // Voice needs fast replies; low effort is plenty for short turns.
            output_config: { effort: 'low' },
            // If a request is declined by a safety check, the API retries it on
            // a suitable fallback model instead of failing the conversation.
            fallbacks: 'default'
        };
        if (schema) {
            body.output_config.format = { type: 'json_schema', schema: schema };
        }

        var rm = new sn_ws.RESTMessageV2();
        rm.setEndpoint(this.endpoint);
        rm.setHttpMethod('post');
        rm.setHttpTimeout(30000);
        rm.setRequestHeader('Content-Type', 'application/json');
        rm.setRequestHeader('x-api-key', this._getApiKey());
        rm.setRequestHeader('anthropic-version', '2026-10-21');
        rm.setRequestHeader('anthropic-beta', 'server-side-fallback-2026-07-01');
        rm.setRequestBody(JSON.stringify(body));

        var response = rm.execute();
        var status = response.getStatusCode();
        var parsed;
        try {
            parsed = JSON.parse(response.getBody());
        } catch (e) {
            return this._fail('Could not read response (HTTP ' + status + ')');
        }

        if (status !== 200) {
            var msg = parsed.error ? parsed.error.message : 'HTTP ' + status;
            return this._fail(msg);
        }
        if (parsed.stop_reason === 'refusal') {
            return this._fail('Request declined');
        }

        var text = '';
        for (var i = 0; i < parsed.content.length; i++) {
            if (parsed.content[i].type === 'text') {
                text += parsed.content[i].text;
            }
        }

        var data = null;
        if (schema) {
            try {
                data = JSON.parse(text);
            } catch (e2) {
                return this._fail('Reply was not valid JSON');
            }
        }
        return { ok: true, text: text, data: data, error: '' };
    },

    _getApiKey: function () {
        var credId = gs.getProperty('x_2244524_voice_0.claude.credential_id');
        var provider = new sn_cc.StandardCredentialsProvider();
        var credential = provider.getCredentialByID(credId);
        return credential.getAttribute('api_key');
    },

    _fail: function (message) {
        gs.error('ClaudeClient: ' + message);
        return { ok: false, text: '', data: null, error: message };
    },

    type: 'ClaudeClient'
};

# Connect ServiceNow to the Claude API

This gives the scoped app (`x_2244524_voice_0`) a small, reusable `ClaudeClient` that Virtual Agent topics can call to understand what a caller said and write ticket summaries.

## 1. Get an API key

1. Sign in at [console.anthropic.com](https://console.anthropic.com) and add a small amount of credit. A demo like this costs very little.
2. Under **Settings > Limits**, set a low monthly spend limit so a bug can never run up a bill.
3. Under **API keys**, click **Create key**, name it `servicenow-pdi`, and copy it. It's shown only once.

Never commit the key to GitHub or paste it into a chat or screenshot.

## 2. Store the key in ServiceNow

> **First, switch the application picker (globe icon in the top bar) to Global.** If the Voice Helpdesk Agent app is selected, the credential can be captured as part of the app and committed to GitHub.

1. Go to **Connections & Credentials > Credentials** and click **New**.
2. Choose **API Key Credentials**.
3. **Name:** `Anthropic API`
4. **API Key:** paste the key. Right-click the form header and choose **Save**.
5. Right-click the header again and choose **Copy sys_id**.
6. Switch the application picker back to **Voice Helpdesk Agent**.

The key lives only in this encrypted record in your instance. The app stores just the record's sys_id, which is harmless on GitHub.

## 3. Add a system property for the credential

In Studio, with the **Voice Helpdesk Agent** app selected, create a **System Property**:

| Field | Value |
|---|---|
| Name | `x_2244524_voice_0.claude.credential_id` |
| Type | string |
| Value | the sys_id from step 2 |

## 4. Create the `ClaudeClient` script include

In Studio: **Create > Script Include**.

- **Name:** `ClaudeClient`
- **Accessible from:** This application scope only
- **Script:**

```javascript
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
```

Every failure returns `ok: false` instead of throwing, so a Virtual Agent topic can fall back to the "I'm having trouble reaching the system" path from the [error handling design](../../design/03-flows.md#error-handling).

## 5. Test it

Go to **System Definition > Scripts - Background**, set the scope to **Voice Helpdesk Agent**, and run:

```javascript
var claude = new x_2244524_voice_0.ClaudeClient();

// 1. Plain reply
var r1 = claude.send(
    'You are Athena, a brief and friendly IT help desk assistant. Reply in one sentence.',
    [{ role: 'user', content: 'Hi, who are you?' }]
);
gs.info('Reply: ' + (r1.ok ? r1.text : 'ERROR ' + r1.error));

// 2. Intent classification with structured output
var schema = {
    type: 'object',
    properties: {
        intent: { type: 'string', enum: ['check_status', 'report_issue', 'talk_to_person', 'unclear'] },
        summary: { type: 'string' }
    },
    required: ['intent', 'summary'],
    additionalProperties: false
};
var r2 = claude.send(
    'Classify what the caller wants. summary is a ticket-style description under 80 characters, or empty if not reporting an issue.',
    [{ role: 'user', content: 'my vpn keeps cutting out every ten minutes, driving me nuts' }],
    schema
);
gs.info('Intent: ' + (r2.ok ? JSON.stringify(r2.data) : 'ERROR ' + r2.error));
```

You should see a one-sentence greeting from Athena, then something like `{"intent":"report_issue","summary":"VPN disconnects every 10 minutes"}`.

If it fails, the error is in the output and in **System Logs > All** (search for `ClaudeClient`). Common causes:

| Error | Fix |
|---|---|
| `authentication_error` | API key copied wrong. Re-paste it into the credential. |
| `credit balance is too low` | Add credit in the Anthropic console. |
| Null credential / cannot read `getAttribute` | The property value isn't the credential's sys_id, or the app can't read the credential. Check step 3. |
| Timeout or connection error | Try again. If it persists, check **System Outbound HTTP Log**. |

## 6. Commit

In Studio: **Source control > Commit changes**, message `Add ClaudeClient script include`. The credential and API key are not part of the app and stay in your instance.

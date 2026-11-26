# Link the ServiceNow app to this repo

This connects a scoped app on your Personal Developer Instance (PDI) to GitHub, so every change you make in ServiceNow can be committed here.

Based on ServiceNow's [Source control in ServiceNow Studio walkthrough](https://www.servicenow.com/community/developer-advocate-blog/source-control-in-servicenow-studio-walkthrough-text-only/ba-p/3356217) and the [Link an app to source control](https://www.servicenow.com/docs/r/yEOfGyFTg0Q8oBn1GnIy5Q/xvxzfSCL69Oq3Gy55sEOfg) docs.

## 1. Create a GitHub token for ServiceNow

1. On GitHub, click your avatar, then **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
2. **Name:** your instance name, e.g. `dev12345`.
3. **Expiration:** 90 days is a sensible choice. Avoid "no expiration". When it expires, push and pull stop working until you make a new one.
4. **Repository access:** *Only select repositories*, then pick `servicenow-voice-helpdesk-agent`.
5. **Permissions:** add **Contents** and change it to **Read and write**. (Metadata is added automatically.)
6. Click **Generate token** and copy it now. GitHub only shows it once.

Never paste this token into the repo, a chat or a screenshot.

## 2. Save the token in ServiceNow

1. In your PDI, go to **Connections & Credentials > Credentials** and click **New**.
2. Choose **Basic Auth Credentials**.
3. **Name:** `GitHub - voice helpdesk agent`
4. **User name:** your GitHub username, exactly.
5. **Password:** the token from step 1 (not your GitHub password).
6. Click **Submit**.

## 3. Create the scoped app

1. Open **ServiceNow Studio** (the new Studio, not "Studio (legacy)" under System Applications).
2. Click **Create > App**.
3. **Name:** `Voice Helpdesk Agent`. Keep it **Scoped**. Click **Continue** and accept the default roles.
4. Click **View app details**.

## 4. Link the app to GitHub

1. In app details, open the **Source control** menu (top right) and choose **Link to source control**.
2. **URL:** `https://github.com/<your-username>/servicenow-voice-helpdesk-agent.git`
3. **Branch:** keep the default, `sn_instances/<your instance>`. This keeps ServiceNow's files on their own branch, separate from the docs on `main`.
4. **Credential:** `GitHub - voice helpdesk agent`
5. Click **Link to source control**, wait for it to finish, then **Close**.

Check GitHub: you should see a new `sn_instances/...` branch containing ServiceNow's app files.

## Day to day

- **Save work to GitHub:** app details > Source control > **Commit changes**. Commit after each working change, with a short message.
- **PDI hibernation:** PDIs sleep when unused and are reclaimed after long inactivity. Committing regularly means your app is safe in GitHub even if the instance is wiped, and you can re-import it onto a new PDI.
- **Avoid** force-pushing or editing the `sn_instances/...` branch directly on GitHub.

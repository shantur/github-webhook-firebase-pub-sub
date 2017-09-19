# Firebase app to act as Pub-Sub for pushing Github Webhooks to services behing NAT / Firewall

## Before everything
1. Create a Firebase Project at https://console.firebase.google.com
2. Install Node.js and firebase-functions and firebase cli tools as mentioned in https://firebase.google.com/docs/functions/get-started
3. Create 2 secret keys as mentioned in https://developer.github.com/webhooks/securing/ One will be **`githubkey`** and other will be **`clientkey`**. Keep a note of them for now.
4. Think about a path name that would identify your webhook receiver like `teamA/projectA/ServiceA`. Path can be any level deep.

## Install - Cloud Function

1. Goto "Cloud" folder and do "firebase init"
2. Select "Functions" when Firebase asks you which cli features you want to setup
3. Select the project you want to use for this.
4. Deploy cloud function using command `firebase deploy --only functions`
5. Set function config using command `firebase functions:config:set webhooks.servicea.clientkey="secret-sky-key" webhooks.servicea.githubkey="secret-github-key" webhooks.servicea.path="/teamA/projectA/ServiceA"` **Make sure here path start with "/"**
6. Deploy your function again using `firebase deploy --only functions`
7. Firebase will deploy your function and list the url to that function. Note that as Function url.


## Install - client

1. Goto `Client` folder.
2. Copy Firebase config from your firebase project console when you do `Add Firebase to Web App` https://firebase.google.com/docs/web/setup
3. Edit and paste the firebase config in `firebaseconfig.js`.
4. Goto Firebase console for your project and select Authentication. Enable Email Password auth and create a new user.
5. Edit `config.js` file and add username and password of the user in login section.
6. Copy the path, clientkey and forwardUrl of the service as set in Cloud Function. Forward url is the url to webhook listener in your local network. This is where github webhook will be posted to. **Path should NOT start with /**
7. Save the file and launch the client using `node index.js config.js firebaseconfig.js`


## Setup webhook on github

1. Follow https://developer.github.com/webhooks/creating/ to create a webhook
2. Url for Webhook is the Function url with path added at end. Like https://my-project.cloudfunctions.net/functions/webhook/teamA/projectA/serviceA
3. Ensure webhook Content Type is set to `application/json`
4. Set the `githubkey` as the secret key and save your webhook.

Now all your webhooks will be sent to your cloud function where it will be verified if it is genuine and signed with sky key and stored. The client will read this webhook again verify if its genuine and then forwarded to your internal server.
You can feed multiple services with this tool you just need to add function config (Install Cloud Function #Step 5) and edit config.js (Install client Function #Step 5) to add more services. It is good practice to keep different keys for all services.

const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const crypto = require('crypto');
const secureCompare = require('secure-compare');


function isValidRequest (req) {
  if (req.path) {
    const config = functions.config().webhooks;

    for (service in config) {
      if (config[service].path == req.path) {
        const cipher = 'sha1';
        const signature = req.headers['x-hub-signature'];

        // TODO: Configure the `github.secret` Google Cloud environment variables.
        const hmac = crypto.createHmac(cipher, config[service].githubkey)
          // The JSON body is automatically parsed by Cloud Functions so we re-stringify it.
          .update(JSON.stringify(req.body, null, 0))
          .digest('hex');

        const expectedSignature = `${cipher}=${hmac}`;

        //Create a signature to be tested by client
        if (secureCompare(signature, expectedSignature)) {
          const skyhmac = crypto.createHmac(cipher, config[service].skykey)
                            .update(signature).digest('hex');

          req.headers['x-sky-signature'] = `${cipher}=${skyhmac}`;

          return true;
        }
      }
    }
  }

  console.log(functions.config());
  console.log("Bad Request Check config Path : " + req.path);
  console.log(req.headers);
  console.log(req.body);

  return false;
}

exports.webhook = functions.https.onRequest((req, res) => {

  const body = req.body;
  const path = req.path;
  const headers = req.headers;

  if (isValidRequest(req)) {
    // Push the new message into the Realtime Database using the Firebase Admin SDK.
    admin.database().ref('/webhooks' + req.path).push({body: body, path: path, headers: headers}).then(snapshot => {
      // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
      res.send(200);
    });
  } else {
    res.status(500).send("Invalid request");
  }
});

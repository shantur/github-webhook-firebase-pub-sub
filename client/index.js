var firebase = require("firebase");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const request = require('request');
const secureCompare = require('secure-compare');
var firebaseConfigModule;

var args = process.argv.slice(2);
var appConfig;

function log(message) {
  console.log(new Date().toISOString() + " : " + message);
}

if (args) {
  log("Using Config file : " + args[0]);
  var configBuffer = fs.readFileSync(path.resolve(__dirname, args[0]), 'utf-8');
  appConfig = JSON.parse(configBuffer);
  log("App Config : " + JSON.stringify(appConfig));

  log("Using firebase config file : " + args[1]);
  firebaseConfigModule = require(path.resolve(__dirname, args[1]));
  log("firebase config : " + JSON.stringify(firebaseConfigModule.firebaseConfig));
}

firebase.initializeApp(firebaseConfigModule.firebaseConfig);

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    log("Login Successful");
    startListeners();
  } else {
    log("Not logged in");
  }
});

firebase.auth().signInWithEmailAndPassword(appConfig.login.username, appConfig.login.password).catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  log("Authentication error : errorCode:" + errorCode + " errorMessage: " +errorMessage);
  process.exit(1);
});

function startListeners() {
  for(service in appConfig.services) {
    startListenerForService(appConfig.services[service]);
  }
}

var database = firebase.database();

function startListenerForService(service) {

  log("Starting Listener for " + JSON.stringify(service));

  var whRef = database.ref('webhooks/' + service.path);

  whRef.on('child_added', function(child) {
    log("Found Webhook : " + child.key + " : " + JSON.stringify(child.val()));
    let webhook = child.val();
    if (verifyWebhook(service, webhook)) {
      log("Webhook verified : " + child.key);
      deliverWebhook(service, webhook, child.key);
    } else {
      log("Cannot verify webhook : " + child.key);
    }
  })

  whRef.on('child_removed', function(child) {
    log("Removed Webhook " + child.key);
  })

}

function verifyWebhook(service, webhook) {
  const cipher = 'sha1';
  const signature = webhook.headers['x-sky-signature'];

  const hmac = crypto.createHmac(cipher, service.clientkey)
    .update(webhook.headers['x-hub-signature'])
    .digest('hex');

  const expectedSignature = `${cipher}=${hmac}`;

  return secureCompare(signature, expectedSignature);
}

function deliverWebhook(service, webhook, webhookKey) {
  var options = {
    url: service.forwardUrl,
    method: "POST",
    json: true,
    headers: webhook.headers,
    body: webhook.body
  };

  request.post(options, function (error, response, body) {
    if (!error) {
      if(response.statusCode == 200){
        log("Webhook delivered : " + webhookKey + " to : " + service.forwardUrl);
      } else {
        log("Webhook delivery failed : " + webhookKey + " to : " + service.forwardUrl + " StatusCode : " + response.statusCode + " Response : " +  JSON.stringify(body));
      }
    } else {
      log("Webhook delivery failed : " + webhookKey + " to : " + service.forwardUrl + "Error : " + JSON.stringify(error));
    }
    deleteWebhook(service, webhookKey);
  });
}

function deleteWebhook(service, webhookKey) {
  log("Delete webhook: " + webhookKey);
  database.ref('webhooks/' + service.path + "/" + webhookKey).remove();
}

log("Jenkins webhook listener ready");

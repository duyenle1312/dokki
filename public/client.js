// run by the browser each time your view template referencing it is loaded

var $loginPage = $(".login.page"); // The login page
var $chatPage = $(".chat.page"); // The chat page
var userName, email, language;

function ValidateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Wait for the button submitted
$(document).ready(function() {
  //when the <submit> button is clicked
  $(".submit_button").click(function() {
    if (document.getElementById("name").value.length != 0) {
      if (
        document.getElementById("email").value.length != 0 &&
        ValidateEmail(document.getElementById("email").value)
      ) {
        //store the user's entry in a variable
        userName = document.getElementById("name").value;
        email = document.getElementById("email").value;
        language = document.getElementById("lan").value;

        // Add new users
        const data = { name: userName, email: email, language: language };

        // Add a new user to database
        fetch("/register", {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" }
        })
          .then(res => res.json())
          .then(response => {
            let res = JSON.stringify(response);
            console.log(res);
            if (res == '"User name accepted!"' || res == '"New user added!"') { // Pay attention to this if the responses change in server.js
              $loginPage.fadeOut();
              $chatPage.show();
              $loginPage.off("click");
            } else alert(res);
          });

        /* reset form
          userName = "";
          email.value = "";
          language.value = "";*/
      }
      else alert("Error: Invalid email!");
    }
  });
});

// Chating functions part
const form = document.forms[0];
const inputField = form.elements["chatbox-input"];
const sendButton = form.elements["chatbox-send"];

sendButton.disabled = true;
inputField.addEventListener("input", function() {
  sendButton.disabled = false;
});

form.onsubmit = function(event) {
  event.preventDefault();

  // Send message to Duyen's model
  addAnswer(inputField.value);
  
  /* Send new messages to OpenAI
  addMessage(inputField.value, "answer");
  const input = { email: email, chat: inputField.value, name: userName };

  fetch("/addChatOpenAI", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(response => {
      let question = response.substring(6, response.length-1);
      addMessage(question, "question");
    });*/

  inputField.value = "";
  inputField.focus();
  sendButton.disabled = true;
};

function addMessage(text, classSelector) {
  const conversation = document.querySelector(".conversation");

  let p = document.createElement("p");
  p.classList.add("chat");
  p.classList.add(classSelector);
  p.innerHTML = text;

  conversation.insertBefore(p, conversation.firstChild);
  conversation.scrollTop = conversation.scrollHeight;
  
  // Add new messages to database, when using openAI, delete the code after this line

  const data = { email: email, chat: text, tag: classSelector };

  fetch("/addChat", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(response => {
      console.log(JSON.stringify(response));
    });
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function addAnswer(text) {
  addMessage(text, "answer");
  askWhy(text);
}

function generateTextAnswer(text) {
  let tokenizer, corpus;
  let file = "";
  if (language == "vi") {
    // Tokenizer
    text = text.replace(/[&\/\\#`,+()$~%.'":*!?<>{}]/g, '');
    tokenizer = text.split(" ");
    corpus = [];
    for (let i = 0; i < tokenizer.length; i++) {
      if (tokenizer[i] == "") continue;
      else corpus[i] = tokenizer[i].toLowerCase();
    }
    
    file = "./word_index_vi.json"; // set file path
  }
  if (language == "en" || language == "other") {
    // Tokenizer
    tokenizer = text.split(/\W+/);
    corpus = [];
    for (let i = 0; i < tokenizer.length; i++) {
      if (tokenizer[i] == "") continue;
      else corpus[i] = tokenizer[i].toLowerCase();
    }

    file = "./word_index_en.json";
  }
  
  // padding='post', max_len=20, truncate='post'
  let padding = [];
  
  fetch(file) //path should be in public
  .then(response => { 
        //console.log(response);
        return response.json();
  })
  .then(data => {
        //console.log(data); // already a json object, no need to parse
        var words = data;
        for (let i = 0; i < 20; i++) {
        if (i >= corpus.length) padding[i] = 0;
        // if text not in data
        else if (!words.hasOwnProperty(corpus[i])) padding[i] = 1;
        else padding[i] = words[corpus[i]];
      }
      //console.log("Padding: ", padding);
      findLabel(padding);
  })
  .catch(err => {
        // Do something for an error here
        console.log("Error Reading data " + err);
  });
}

async function findLabel(padding) {
  if (language == "vi") var path = "./model_vi/model.json";
  if (language == "en") var path = "./model_en/model.json";
  if (language == "other") var path = "./model_en/model.json";
  const model = await tf.loadLayersModel(path);
  let result = model.predict(tf.tensor(padding).reshape([-1, 20]));
  const predictedValue = result.arraySync()[0];
  var result_max = Math.max.apply(Math, predictedValue);
  let pie = 3 * (1 / predictedValue.length); // Define the smallest probabilities to get through
  console.log(result_max, 3 * (1 / predictedValue.length));

  if (result_max > 0.9) {
    console.log("Answer is accepted!");
    let result_index = predictedValue.indexOf(
      Math.max.apply(Math, predictedValue)
    );

    // Read label_encoder file
    let file = "";
    if (language == "vi") file = "./labels_encoder_vi.json"; // set file path
    if (language == "en" || language == "other") file = "./labels_encoder_en.json";

    fetch(file) //path should be in public
    .then(response => { 
          //console.log(response);
          return response.json();
    })
    .then(data => {
          //console.log(data); // already a json object, no need to parse
          var labels = data;
          let tag = getKeyByValue(labels, result_index);

          findResponse(tag);
    })
    .catch(err => {
          // Do something for an error here
          console.log("Error Reading data " + err);
    });
  }
  else {
    // Read intents file
    let file = "";
    if (language == "vi") file = "./intents_vi.json"; // set file path
    if (language == "en" || language == "other") file = "./intents_en.json";

    fetch(file) //path should be in public
    .then(response => { 
          //console.log(response);
          return response.json();
    })
    .then(data => {
          //console.log(data); // already a json object, no need to parse
          var mydata = data;
          let len = mydata["intents"].length - 1;
          let random = getRandomInt(mydata["intents"][len]["default"].length);
          addMessage(mydata["intents"][len].default[random], "question");
          console.log("Default answer is selected!");
    })
    .catch(err => {
          // Do something for an error here
          console.log("Error Reading data " + err);
    });
  }
}

function findResponse(tag) {
  var response;
  
  // Read intents file
  let file = "";
  if (language == "vi") file = "./intents_vi.json"; // set file path
  if (language == "en" || language == "other") file = "./intents_en.json";
  
  fetch(file) //path should be in public
  .then(response => { 
        //console.log(response);
        return response.json();
  })
  .then(data => {
        //console.log(data); // already a json object, no need to parse
        var mydata = data;
        for (let i = 0; i < mydata["intents"].length; i++) {
          if (mydata["intents"][i].tag == tag) {
            // change this latter
            let random = getRandomInt(mydata["intents"][i]["responses"].length);
            // expected output: an int between 0 and length of responses options
            //console.log(mydata["intents"][i].responses[random]);
            response = mydata["intents"][i].responses[random];
            addMessage(response, "question");
          }
        }
  })
  .catch(err => {
        // Do something for an error here
        console.log("Error Reading data " + err);
  });
}

function askWhy(text) {
  generateTextAnswer(text);
}

/* Make sure the app always fits in the viewport */
window.addEventListener("resize", fitAppToWindow);

function fitAppToWindow() {
  // First, get the viewport height and multiple it by 1% to get a value for a vh unit
  let vh = window.innerHeight * 0.01;
  // Then set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

fitAppToWindow();



//const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
//const { Firestore } = require("@google-cloud/firestore");
//const db = new Firestore({ projectId: credentials.project_id, credentials });

/* Clear Users Data
const clearButton = document.querySelector("#clear-dreams");

clearButton.addEventListener("click", event => {
  fetch("/clearUsers", {})
    .then(res => res.json())
    .then(response => {
      console.log("cleared dreams");
    });
});

// When "Add Dreams" button is clicked
$(".add_button").click(function() {
  //store the user's entry in a variable
  userName = document.getElementById("name").value;
  email = document.getElementById("email").value;
  language = document.getElementById("lan").value;
  
  // Add new chat
  const data = { email: email, chat: language, tag: userName };

  fetch("/addChat", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(response => {
      console.log(JSON.stringify(response));
    });
});

// When "Update Data" button is clicked
$(".update_button").click(function() {
  //store the user's entry in a variable
  userName = document.getElementById("name").value;
  email = document.getElementById("email").value;
  language = document.getElementById("lan").value;
  
  // Add new users
  const data = { name: userName, email: email, language: language };

  fetch("/updateData", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(response => {
      console.log(JSON.stringify(response));
    });
});*/

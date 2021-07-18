const form = document.forms[0];
const inputField = form.elements["chatbox-input"];
const sendButton = form.elements["chatbox-send"];

sendButton.disabled = true;
inputField.addEventListener("input", function() {
  sendButton.disabled = false;
});

form.onsubmit = function(event) {
  event.preventDefault();

  addAnswer(inputField.value);

  inputField.value = "";
  inputField.focus();
  sendButton.disabled = true;
};

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

    // Tokenizer
    let tokenizer = text.split(/\W+/)
    let corpus = []
    for (let i = 0; i < tokenizer.length; i++) {
        if (tokenizer[i] == "") continue;
        else corpus[i] = tokenizer[i].toLowerCase();
    }

    // padding='post', max_len=20, truncate='post' 
    let padding = []


    // Create XMLHttpRequest object to open JSON file of Intents
    var oXHR = new XMLHttpRequest();

    // Initiate request.
    oXHR.onreadystatechange = reportStatus;
    oXHR.open("GET", "./word_index.json", true);  // get json file.
    oXHR.send();

    function reportStatus() {
        if (oXHR.readyState == 4) {		// Check if request is complete.
            let data = this.responseText;
            //console.log(data)
            var words = JSON.parse(data);
            //alert(words['my']);

            for (let i = 0; i < 20; i++) {
                if (i >= corpus.length) padding[i] = 0; // if text not in data
                else if (!words.hasOwnProperty(corpus[i])) padding[i] = 1;
                else padding[i] = words[corpus[i]];
            }

            findLabel(padding);
        }
    }
}

var response;

async function findLabel(padding) {
    const model = await tf.loadLayersModel('./chat_model/model.json');
    let result = model.predict(tf.tensor(padding).reshape([-1, 20]));
    const predictedValue = result.arraySync()[0];
    var result_max = Math.max.apply(Math, predictedValue);
    let pie = 3 * (1 / predictedValue.length); // Define the smallest probabilities to get through
    console.log(result_max, '/' , 3 * (1 / predictedValue.length))

    if (result_max > pie) console.log("Result is safe!");
    else console.log("Tag is unknown");
    result_index = predictedValue.indexOf(Math.max.apply(Math, predictedValue))

    // Read label_encoder file

    // Create XMLHttpRequest object to open JSON file of Intents
    var oXHR = new XMLHttpRequest();

    // Initiate request.
    oXHR.onreadystatechange = reportStatus;
    oXHR.open("GET", "./labels_encoder.json", true);  // get json file.
    oXHR.send();

    function reportStatus() {
        if (oXHR.readyState == 4) {		// Check if request is complete.
            let data = this.responseText;
            var labels = JSON.parse(data);
            let tag = getKeyByValue(labels, result_index)

            findResponse(tag);
        }
    }
}

function findResponse(tag) {
    // Create XMLHttpRequest object to open JSON file of Intents
    var oXHR = new XMLHttpRequest();

    // Initiate request.
    oXHR.onreadystatechange = reportStatus;
    oXHR.open("GET", "./intents.json", true);  // get json file.
    oXHR.send();

    function reportStatus() {
        if (oXHR.readyState == 4) {		// Check if request is complete.
            var intents = this.responseText;
            //console.log(intents)

            var mydata = JSON.parse(intents);
            //alert(mydata['intents'][0].tag);

            for (let i = 0; i < mydata['intents'].length; i++) {
                if (mydata['intents'][i].tag == tag) { // change this latter
                    let random = getRandomInt(mydata['intents'][i]['responses'].length)
                    // expected output: an int between 0 and length of responses options
                    console.log(mydata['intents'][i].responses[random])
                    response = mydata['intents'][i].responses[random];
                    addMessage(response, "question")
                }
            }
        }
    }
}

function askWhy(text) {
    generateTextAnswer(text);
    //addMessage("Hi, my name is Duyen!", "question");
}

function addMessage(text, classSelector) {
  const conversation = document.querySelector(".conversation");

  let p = document.createElement("p");
  p.classList.add("chat");
  p.classList.add(classSelector);
  p.innerHTML = text;

  conversation.insertBefore(p, conversation.firstChild);
  conversation.scrollTop = conversation.scrollHeight;
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

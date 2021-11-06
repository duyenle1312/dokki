// server.js where your app starts
const express = require("express");
const bodyParser = require("body-parser");
const {spawn} = require('child_process');
const app = express();

const fs = require("fs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// init sqlite db
const dbFile = "./.data/data.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

app.get('/', (req, res) => {
 res.sendFile(`${__dirname}/public/index.html`);
});

app.use(express.static("public"));

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email EMAIL, language TEXT, chat TEXT, login TEXT, info TEXT)"
    );
    console.log("New table Users created!");

    // insert default dreams
    db.serialize(() => {
      db.run(
        'INSERT INTO Users (name, email, language) VALUES ("Duyen", "duyenle131202@gmail.com", "vi")'
      );
    });
  } else {
    console.log('Database "Users" ready to go!');
    db.each("SELECT * from Users", (err, row) => {
      if (row) {
        console.log(
          `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nID: ${row.id}, Language: ${row.language}\nName: ${row.name}, email: ${row.email}\n${row.login}\n---CHAT STARTS HERE---\n${row.chat}`
        );
      }
    });
  }
});

// Check a new user in database
app.post("/register", function(request, response) {
  console.log("got register post", request.body);
  if (request.body.name && request.body.email && request.body.language) {
    db.get(
      "SELECT * FROM Users WHERE email=? LIMIT 1",
      request.body.email,
      function(err, row) {
        if (row) {
          if (row.name != request.body.name) response.send(JSON.stringify("Wrong user name!"));
          else {
            var today = new Date();
            var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
            var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            var dateTime = "Last log in: "+date+' '+time+'\n';
            //console.log(dateTime);
            
            db.run(`UPDATE Users SET login=? WHERE email=?`, dateTime, request.body.email);
            response.send(JSON.stringify("User name accepted!"));
          };
        } else {
          var today = new Date();
          var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
          var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
          var dateTime = "Last log in: " + date + " " + time + '\n';
          //console.log(dateTime);
          
          var stmt = db.prepare(
            "INSERT INTO Users (name, email, language, login) VALUES (?,?,?,?)"
          );
          stmt.run(request.body.name, request.body.email, request.body.language, dateTime);
          response.send(JSON.stringify("New user added!"));
        }
      }
    );
  } else {
    response.send(JSON.stringify("Username and email are required"));
  }
});

// Select dream row
function selectRows(cleansedEmail, callback) {
  let chat = "Hey";
  db.all("SELECT chat FROM Users WHERE email=?", cleansedEmail, function(err, rows) {
    rows.forEach(function(row) {
      if (row.chat == null) chat = "";
      else chat = row.chat + "\n";
    });
    callback(chat); // this will "return" your value
  });
}

// endpoint to add a message to the database
app.post("/addChatOpenAI", (request, response) => {
  console.log(
    `GPT3: '${request.body.chat}' for ${request.body.name} (${request.body.email})`
  );

  // DISALLOW_WRITE is an ENV variable that gets reset for new projects
  // so they can write to the database
  if (!process.env.DISALLOW_WRITE) {
    const cleansedName = cleanseString(request.body.name);
    const cleansedMessage = cleanseString(request.body.chat);
    const cleansedEmail = cleanseString(request.body.email);
    let prompt, def_name, oldChat;

    selectRows(cleansedEmail, function(chats) {
      if (chats == "") chats = "The following is a conversation with a friendly AI assistant. The assistant is helpful, humorous, creative, clever, and very friendly.\n\nUser: Hello, my name is " + cleansedName + ". Who are you?\nDokki: My name is Dokki, an AI chatbot. I'm here to listen to your personal stories! <3\nUser: "
      else {
        chats = chats.substring(0, chats.length - 1);
        //console.log(chats);
      };
      prompt = cleanseString(chats + cleansedMessage + "\n");
      
      // Reading Python files
      var dataToSend;
      // spawn new child process to call the python script
      const python = spawn('python3', ['public/GPT3.py', prompt, cleansedName, "openAI"]);

     // collect data from script
     python.stdout.on('data', function (data) {
      dataToSend = data.toString();
     });

     python.stderr.on('data', data => {
      console.error(`stderr: ${data}`);
     });

     // in close event we are sure that stream from child process is closed
     python.on('exit', (code) => {
     console.log(`child process exited with code ${code}, ${dataToSend}`);
     oldChat = prompt + dataToSend + "User: "
       
     db.run(`UPDATE Users SET chat=? WHERE email=?`, oldChat, cleansedEmail, function(err) {
          if (err) {
            console.log({ message: err.message });
          } else {
            //console.log({ message: "OpenAI Message Added!" });
          }
        }
     );
     response.send(JSON.stringify(dataToSend));
    });  
    });
  }
});

// endpoint to clear dreams from the database
app.get("/clearUsers", (request, response) => {
  // DISALLOW_WRITE is an ENV variable that gets reset for new projects so you can write to the database
  if (!process.env.DISALLOW_WRITE) {
    db.each(
      "SELECT * from Users",
      (err, row) => {
        console.log("row", row);

        //Delete Data from Users table
        db.run(`DELETE FROM Users WHERE ID=?`, row.id, error => {
          /*if (row) {
            console.log(`deleted row ${row.id}`);
          }*/
        });

        // Reset id sequence
        db.all(`UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='Users'`);
      },

      err => {
        if (err) {
          response.send({ message: "error deleting data!" });
        } else {
          console.log("Data deleted successfully!");
          response.send({ message: "success deleting data" });
        }
      }
    );
  }
});

// endpoint to update data to the database
app.post("/updateData", (request, response) => {
  console.log(
    `Update data '${request.body.language}' for ${request.body.name}: ${request.body.email}`
  );

  // DISALLOW_WRITE is an ENV variable that gets reset for new projects so they can write to the database
  if (!process.env.DISALLOW_WRITE) {
    // Add new dream
    const cleansedLanguage = cleanseString(request.body.language);
    const cleansedEmail = cleanseString(request.body.email);
    const cleansedName = cleanseString(request.body.name);

    // Retrieve data from user name
    db.all("SELECT language FROM Users WHERE email=? and name=?", cleansedEmail, cleansedName,
      function(err, rows) {
        rows.forEach(function(row) {
          console.log("Selected: ", row.language);
          let pastDream = row.language;
        });
      }
    );

    db.run(`UPDATE Users SET language=? WHERE email=? and name=?`, cleansedLanguage, cleansedEmail,
      cleansedName, function(err) {
        if (err) {
          response.send({ message: err.message });
        } else {
          response.send({ message: "Data Updated Successfully!" });
        }
      }
    );
  }
});

// endpoint to add a message to the database
app.post("/addChat", (request, response) => {
  //console.log(`Add message: '${request.body.chat}' for ${request.body.tag} (${request.body.email})`);

  // DISALLOW_WRITE is an ENV variable that gets reset for new projects
  // so they can write to the database
  if (!process.env.DISALLOW_WRITE) {
    // Add new dream
    const cleansedMessage = cleanseString(request.body.chat);
    const cleansedEmail = cleanseString(request.body.email);
    const cleansedTag = cleanseString(request.body.tag);

    let pastdreams = "";

    selectRows(cleansedEmail, function(chats) {
      if (cleansedTag == 'question') pastdreams = cleanseString(chats + "Bot: " + cleansedMessage);
      else pastdreams = cleanseString(chats + "User: " + cleansedMessage);
      //console.log("Data: ", pastdreams);

      db.run(
        `UPDATE Users SET chat=? WHERE email=?`,
        pastdreams,
        cleansedEmail,
        function(err) {
          if (err) {
            response.send({ message: err.message });
          } else {
            response.send({ message: "Message Added Successfully!" });
          }
        }
      );
    });
  }
});

// helper function that prevents html/css/script malice
const cleanseString = function(string) {
  return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// listen for requests :)
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

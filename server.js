// server.js where your app starts

// init project
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// init sqlite db
const dbFile = "./.data/data.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email EMAIL, language TEXT, chat TEXT)"
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
          `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nID: ${row.id}, Language: ${row.language}\nName: ${row.name}, email: ${row.email}\n---CHAT STARTS HERE---\n${row.chat}`
        );
      }
    });
  }
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(`${__dirname}/public/index.html`);
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
            //db.run(`UPDATE Users SET language=? WHERE email=?`, request.body.language, request.body.email);
            response.send(JSON.stringify("User name accepted!"));
          };
        } else {
          var stmt = db.prepare(
            "INSERT INTO Users (name, email, language) VALUES (?,?,?)"
          );
          stmt.run(request.body.name, request.body.email, request.body.language);
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
  console.log(
    `Add message: '${request.body.chat}' for ${request.body.tag} (${request.body.email})`
  );

  // DISALLOW_WRITE is an ENV variable that gets reset for new projects
  // so they can write to the database
  if (!process.env.DISALLOW_WRITE) {
    // Add new dream
    const cleansedMessage = cleanseString(request.body.chat);
    const cleansedEmail = cleanseString(request.body.email);
    const cleansedTag = cleanseString(request.body.tag);
    console.log("tag: ", cleansedTag);
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

// helper function that prevents html/css/script malice
const cleanseString = function(string) {
  return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// listen for requests :)
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

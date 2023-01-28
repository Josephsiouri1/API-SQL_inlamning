let express = require("express");

let app = express();

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const mysql = require("mysql");

app.use(express.json());

app.set("view engine", "ejs");

con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "webbserverprogrammering",
  options: {
    encrypt: true,
  },
});

app.get("/", function (req, res) {
  res.render("dokumentation");
});

const COLUMNS = [
  "username",
  "firstname",
  "lastname",
  "userId",
  "password",
  "salary",
];

app.get("/employees", function (req, res) {
  let sql = "SELECT * FROM employees";
  let condition = createCondition(req.query); //skickar objektet utifrån URL data.

  con.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});

let createCondition = function (query) {
  let output = " WHERE ";
  for (key in query) {
    //kommer att gå igenom varje attribut i objektet query som blev formad av skrivna värden i URL, kontrollera att attributet finns i sql tabellen och därefter få dess värde
    //exempel i vad kan skrivas i URL: /employees?username=JOSI&lastname=Siouri => omvandlas till {username:'JOSI', lastname:'Siouri'}
    if (COLUMNS.includes(key)) {
      output += `${key}="${query[key]}" OR `;
    }
  }
  if (output.length == 7) {
    return ""; // om query är tomt eller inte är relevant för vår databastabell - returnera en tom sträng
  } else {
    return output.substring(0, output.length - 4); // ta bort sista " OR "
  }
};

app.get("/employees/:id", function (req, res) {
  let sql = "SELECT * FROM employees WHERE employeeId=" + req.params.id;
  console.log(sql);
  con.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404); // 404=not found
    }
  });
});

app.post("/addemployee", function (req, res) {
  console.log(req.body);
  if (isValidUserData(req.body)) {
    let sql = `INSERT INTO employees (username, firstname, lastname,password, salary) VALUES ('${
      req.body.username
    }','${req.body.firstname}',${req.body.employeeId} ,'${bcrypt.hash(
      req.body.password,
      10
    )}', '${req.body.salary}')`;
    con.query(sql, function (err, result, fields) {
      if (result) {
        res.send("New data has successfully been added to the database.");
      }
    });
  } else {
    res.send("More data is required!");
  }
});

function isValidUserData(body) {
  return (
    body.username &&
    body.firstname &&
    body.lastname &&
    body.password &&
    body.salary
  ); // denna funktion retunerar 'true' om alla input var fyllda med något värde.
}

app.put("/update/:id", (req, res) => {
  // Hämtar id från URL
  let id = req.params.id;

  // Kontrollera inkommande data
  if (
    !req.body.username ||
    !req.body.firstname ||
    !req.body.lastname ||
    !req.body.password ||
    !req.body.salary
  ) {
    res.status(400).send("More data is required to update.");
  }

  let hashedPassword = bcrypt.hash(req.body.password, 10);

  // Skapar en variabel för uppdateringssatsen
  let updateData = {
    username: req.body.username,
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    password: hashedPassword,
    salary: req.body.salary,
  };

  // Skapar en SQL-sats för att uppdatera data
  let sql = `UPDATE employees SET ? WHERE employeeId = ${id}`;

  // Kör SQL-satsen
  con.query(sql, updateData, (error, results) => {
    if (error) {
      res
        .status(500)
        .send("Error while updating employee with employee id " + id);
    }

    res.send("Employee updated successfully.");
  });
});

app.post("/login", async (req, res) => {
  // hämta användarnamnet och lösenordet från inkommande data
  let username = req.body.username;
  let password = req.body.password;

  // hämta användaren från databasen

  const result = con.query(
    "SELECT * FROM employees WHERE username ='" + username + "'"
  );

  // om användaren inte finns, returnera ett felmeddelande
  if (result.recordset.length === 0) {
    res.status(401).send("Invalid username or password");
  }

  // hämta hashat lösenord från databasen
  const dbPassword = result.recordset[0].password;

  // jämför inkommande lösenord med hashat lösenord från databasen
  const isMatch = bcrypt.compare(password, dbPassword);

  // om lösenorden matchar, returnera användardata
  if (isMatch) {
    let userData = {
      employeeId: result.recordset[0].employeeId,
      username: result.recordset[0].username,
      firstname: result.recordset[0].firstname,
      lastname: result.recordset[0].lastname,
      employeeId: result.recordset[0].salary,
    };
    // Skapa en tidsbegränsad JWT
    const token = jwt.sign(
      {
        sub: userData.employeeId,
        iat: Date.now(),
      },
      "mysecretkey",
      { expiresIn: "1h" }
    );
    res.json({
      message: "Inloggning lyckades",
      token,
    });

    // return res.status(200).json(userData);
  } else {
    // annars returnera ett felmeddelande
    res.status(401).send("Invalid username or password");
  }
});
console.log("Servern körs på port 3000");

app.listen(3000);

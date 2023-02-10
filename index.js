let express = require("express");

let app = express();

let bcrypt = require("bcrypt");

const crypto = require("crypto");
function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

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
  multipleStatements: true,
});

app.get("/", function (req, res) {
  res.render("dokumentation");
});

const COLUMNS = [
  "employeeId",
  "username",
  "firstname",
  "lastname",
  "password",
  "salary",
];

// Funktion för att validera användaruppgifter
function validateEmployee(username, password) {
  for (let employee of COLUMNS) {
    if (employee.username === username && employee.password === password) {
      return employee;
    }
  }
  return null;
}

app.get("/employees", validateEmployee, function (req, res) {
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
  if (isValidUserData(req.body)) {
    saltRounds = 10;
    const hashedPassword = hash(req.body.password);

    let sql = `INSERT INTO employees (username, firstname, lastname, password, salary) VALUES ('${req.body.username}','${req.body.firstname}','${req.body.lastname}' ,'${hashedPassword}', '${req.body.salary}')`;

    con.query(sql, function (err, result) {
      if (err) {
        console.error(err);
        res
          .status(500)
          .send("Någonting gick fel när användaren skulle läggas till.");
      } else {
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

  let hashedPassword = hash(req.body.password);

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

app.post("/login", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  let sql = `SELECT * FROM employees WHERE username = '${username}'`;
  con.query(sql, async (error, results) => {
    if (error) {
      console.log(error);
      return res.status(500).send("Internal server error");
    }
    if (!results.length) {
      return res.status(400).send("Incorrect username or password");
    }
    let employee = results[0];

    let isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return res.status(400).send("Incorrect username or password");
    }

    let secretKey = "mysecretkey";
    let expiresIn = "1h";
    let token = jwt.sign({ username }, secretKey, { expiresIn });

    res.status(200).send({
      username: employee.username,
      firstname: employee.firstname,
      lastname: employee.lastname,
      salary: employee.salary,
      token,
    });
  });
});

console.log("Servern körs på port 3000");

app.listen(3000);

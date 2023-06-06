var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mysql = require("mysql2");
var cors = require("cors");

var isProduct = true;

//dev

var whitelist = ["http://85.239.242.39:5555", "http://85.239.242.39"];
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(isProduct ? corsOptions : { origin: "http://localhost:5555" }));

app.use(bodyParser.json({ type: "application/json" }));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.all("*", function (req, res, next) {
  /**
   * Response settings
   * @type {Object}
   */
  var responseSettings = {
    AccessControlAllowOrigin: req.headers.origin,
    AccessControlAllowHeaders:
      "Content-Type,X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5,  Date, X-Api-Version, X-File-Name",
    AccessControlAllowMethods: "POST, GET, PUT, DELETE, OPTIONS",
    AccessControlAllowCredentials: true,
  };

  /**
   * Headers
   */
  res.header(
    "Access-Control-Allow-Credentials",
    responseSettings.AccessControlAllowCredentials
  );
  res.header(
    "Access-Control-Allow-Origin",
    responseSettings.AccessControlAllowOrigin
  );
  res.header(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"]
      ? req.headers["access-control-request-headers"]
      : "x-requested-with"
  );
  res.header(
    "Access-Control-Allow-Methods",
    req.headers["access-control-request-method"]
      ? req.headers["access-control-request-method"]
      : responseSettings.AccessControlAllowMethods
  );

  if ("OPTIONS" == req.method) {
    res.send(200);
  } else {
    next();
  }
});

app.get("/", function (req, res) {
  return res.send({ error: false, message: "Hello from Linh Ken" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, function () {
  console.log("Node app is running on port 5000");
});

var dbSurvey;

//product cPanel db_config
var db_config = isProduct
  ? {
      host: "localhost",
      user: "linhken",
      password: "silinh66*",
      database: "survey",
    }
  : {
      host: "localhost",
      user: "root",
      password: "123456",
      database: "survey",
    };

function handleDisconnect() {
  dbSurvey = mysql.createConnection(db_config);
  console.log("restart");
  dbSurvey.connect(function (err) {
    console.log("Connection OK");
    if (err) {
      console.log("error when connecting to db:", err);
      setTimeout(handleDisconnect, 2000);
    }
  });

  dbSurvey.on("error", function (err) {
    console.log("db error", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      // Connection to the MySQL server is usually
      handleDisconnect(); // lost due to either server restart, or a
    } else {
      // connnection idle timeout (the wait_timeout
      throw err; // server variable configures this)
    }
  });
}

handleDisconnect();

async function query(query, params = []) {
  let result = await dbSurvey
    .promise()
    .query(query, params, function (error, results, fields) {
      if (error) throw error;
    });
  return result[0];
}

/*------------------DATA---------------------*/
// Retrieve all data
app.get("/survey", function (req, res) {
  dbSurvey.query("SELECT * FROM data", function (error, results, fields) {
    if (error) throw error;
    return res.send({ error: false, data: results, message: "data list." });
  });
});

// Retrieve data with id
app.get("/survey/:id", function (req, res) {
  let data_id = req.params.id;
  if (!data_id) {
    return res
      .status(400)
      .send({ error: true, message: "Please provide data_id" });
  }
  dbSurvey.query(
    "SELECT * FROM data where id=?",
    data_id,
    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results[0],
        message: "data list.",
      });
    }
  );
});

// Add a new data
app.post("/survey/add", async function (req, res) {
  let data = req.body.data;
  console.log("data", data);
  if (!data) {
    return res
      .status(400)
      .send({ error: true, message: "Please provide data" });
  }
  let newData = await query(
    "INSERT INTO data (name, academic, personality) values (?, ?, ?)",
    [data.name, data.academic, data.personality]
  );
  for (let i = 0; i < data.listAspiration.length; i++) {
    const aspiration = data.listAspiration[i];
    await query(
      "INSERT INTO aspiration (id_data, university, major, block, isLike) values (?, ?, ?, ?, ?)",
      [
        newData.insertId,
        aspiration.university,
        aspiration.major,
        aspiration.block,
        aspiration.isLike,
      ]
    );
  }
  return res.send({
    error: false,
    message: "New data has been created successfully.",
  });
});

//  Update data with id
app.put("/survey", function (req, res) {
  let data_id = req.body.data_id;
  let data = req.body.data;
  // console.log("data_id", data_id);
  // console.log("data", data[22]);
  if (!data_id || !data) {
    return res
      .status(400)
      .send({ error: data, message: "Please provide data and data_id" });
  }
  dbSurvey.query(
    "UPDATE data SET id_data = ?, university = ?, major = ?, block =?, isLike = ?  WHERE id = ?",
    [...data, data_id],
    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results,
        message: "data has been updated successfully.",
      });
    }
  );
});

//  Delete data
app.delete("/survey", function (req, res) {
  // console.log("req.body", req.body);
  let data_id = req.body.data_id;
  // console.log("data_id", data_id);
  if (!data_id) {
    return res
      .status(400)
      .send({ error: true, message: "Please provide data_id" });
  }
  dbSurvey.query(
    "DELETE FROM data WHERE id in (?)",
    [data_id],
    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results,
        message: "Data has been delete successfully.",
      });
    }
  );
});

module.exports = app;

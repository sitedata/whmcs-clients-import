const express = require("express");
const whmcs = require("whmcs-api");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 8000;
require("dotenv").config();
const fs = require("fs");
const usersData = require("./users.json"); // assuming the JSON file is in the same directory as this file

// Middlewares
app.use(cors());
app.use(express.json());

// WHMCS API configuration
const config = {
  endpoint: process.env.WHMCS_API_ENDPOINT,
  identifier: process.env.WHMCS_API_IDENTIFIER,
  secret: process.env.WHMCS_API_SECRET,
  accesskey: process.env.WHMCS_API_ACCESS_KEY,
  responsetype: "json",
};

// Creating a new client
const wclient = new whmcs(config);

// Create error log file
const errorLogStream = fs.createWriteStream("error.log", { flags: "a" });

// WHMCS API Test
app.get("/addclients", (req, res) => {
  let failedUsers = [];
  try {
    // Loop through the users array and make the API call for each user
    usersData.forEach((user, index) => {
      setTimeout(() => {
        wclient
          .call("AddClient", {
            skipvalidation: true, // If true it will skip the the required keys If don't have
            firstname: user?.firstname,
            lastname: user?.lastname,
            email: user?.email,
            country: "US",
            phonenumber: user?.phonenumber,
            password2: user?.password,
            noemail: true, // System will not send welcome email
            // You may add more key; Check whmcs api: https://developers.whmcs.com/api-reference/addclient/
          })
          .then(() => {
            console.log(`Client added: ${user?.email}`);
            if (index === usersData.length - 1) {
              if (failedUsers?.length === 0) {
                res.send({
                  success: true,
                  message: "All clients added successfully!",
                });
              } else {
                res.send({
                  success: false,
                  message: `${failedUsers?.length} clients failed to add!`,
                  failedUsers,
                });
              }
            }
          })
          .catch((error) => {
            console.error(error);
            failedUsers.push(user?.email);
            errorLogStream.write(
              `${new Date().toISOString()} - Error creating user ${
                user?.email
              }: ${error}\n`
            );
            if (index === usersData.length - 1) {
              console.log("Line no. 83", failedUsers?.length);
              res.send({
                success: false,
                message: `${failedUsers?.length} clients failed to add!`,
                failedUsers,
              });
            }
          });
      }, index * 5000); // Delay each API call by 5 seconds
    });
  } catch (error) {
    console.log(error?.name, error?.message);
    res.send({
      success: false,
      error: error?.message,
    });
  }
});

// Verify the server is running or not
app.get("/", (req, res) => {
  try {
    res.send({
      success: true,
      message: "Server is running...",
    });
  } catch (error) {
    console.log(error.name, error.message);
    res.send({
      success: false,
      error: error?.message,
    });
  }
});

// Listening the app on a particular port
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

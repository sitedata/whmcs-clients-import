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

// Get clients by email
app.get("/getclients", (req, res) => {
  let foundClients = [];
  let notFoundClients = [];
  let promises = [];

  // Loop through users and create a promise for each search
  usersData.forEach((user) => {
    const promise = wclient
      .call("GetClients", {
        search: user.email,
      })
      .then((data) => {
        if (data.totalresults === 1) {
          foundClients.push(data.clients.client[0].id);
        } else {
          notFoundClients.push(user.email);
        }
      })
      .catch((error) => {
        console.error(`Error getting client: ${error}`);
        res.send({
          success: false,
          error: error.message,
        });
      });

    promises.push(promise);
  });

  // Wait for all promises to resolve and send response
  Promise.all(promises).then(() => {
    res.send({
      success: true,
      foundClients,
      notFoundClients,
    });
  });
});

// Get user id
app.get("/getuserid", (req, res) => {
  try {
    wclient
      .call("GetUsers", {
        search: user?.email,
      })
      .then((data) => {
        if (data.totalresults === 1) {
          res.send({
            success: true,
            userId: data.users[0].id,
          });
        } else {
          res.send({
            success: false,
            error: `User not found with email: ${email}`,
          });
        }
      })
      .catch((error) => {
        console.error(`Error getting user: ${error}`);
        res.send({
          success: false,
          error: error.message,
        });
      });
  } catch (error) {
    console.error(`Error getting user: ${error}`);
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Add clients
app.get("/addclients", (req, res) => {
  let failedUsers = [];
  try {
    // Loop through the users array and make the API call for each user
    usersData.forEach((user, index) => {
      setTimeout(() => {
        wclient
          .call("GetUsers", {
            search: user.email,
          })
          .then((data) => {
            if (data.totalresults === 1) {
              console.log(
                `User found with email: ${user.email} which id: ${data.users[0].id}`
              );
            } else {
              console.log(`User not found with email: ${user.email}`);
            }
            // Add clients
            wclient
              .call("AddClient", {
                skipvalidation: true, // If true it will skip the the required keys If don't have
                owner_user_id: data?.users[0]?.id || 0,
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
                  res.send({
                    success: false,
                    message: `${failedUsers?.length} clients failed to add!`,
                    failedUsers,
                  });
                }
              });
          })
          .catch((error) => {
            console.error(`Error getting user: ${error}`);
            res.send({
              success: false,
              error: error.message,
            });
          });
      }, index * 1000); // Delay each API call by 1 seconds
    });
  } catch (error) {
    console.log(error?.name, error?.message);
    res.send({
      success: false,
      error: error?.message,
    });
  }
});

// Add clients
// app.get("/addclients", (req, res) => {
//   let failedUsers = [];
//   try {
//     // Loop through the users array and make the API call for each user
//     usersData.forEach((user, index) => {
//       setTimeout(() => {
//         wclient
//           .call("AddClient", {
//             skipvalidation: true, // If true it will skip the the required keys If don't have
//             owner_user_id: userId,
//             firstname: user?.firstname,
//             lastname: user?.lastname,
//             email: user?.email,
//             country: "US",
//             phonenumber: user?.phonenumber,
//             password2: user?.password,
//             noemail: true, // System will not send welcome email
//             // You may add more key; Check whmcs api: https://developers.whmcs.com/api-reference/addclient/
//           })
//           .then(() => {
//             console.log(`Client added: ${user?.email}`);
//             if (index === usersData.length - 1) {
//               if (failedUsers?.length === 0) {
//                 res.send({
//                   success: true,
//                   message: "All clients added successfully!",
//                 });
//               } else {
//                 res.send({
//                   success: false,
//                   message: `${failedUsers?.length} clients failed to add!`,
//                   failedUsers,
//                 });
//               }
//             }
//           })
//           .catch((error) => {
//             console.error(error);
//             failedUsers.push(user?.email);
//             errorLogStream.write(
//               `${new Date().toISOString()} - Error creating user ${
//                 user?.email
//               }: ${error}\n`
//             );
//             if (index === usersData.length - 1) {
//               res.send({
//                 success: false,
//                 message: `${failedUsers?.length} clients failed to add!`,
//                 failedUsers,
//               });
//             }
//           });
//       }, index * 1000); // Delay each API call by 1 seconds
//     });
//   } catch (error) {
//     console.log(error?.name, error?.message);
//     res.send({
//       success: false,
//       error: error?.message,
//     });
//   }
// });

// Delete clients
app.get("/deleteclients", (req, res) => {
  try {
    const start = 700000000; // start ID
    const end = 73300000000; // end ID
    // Loop through the range of client IDs and make the API call for each client
    for (let i = start; i <= end; i++) {
      wclient
        .call("DeleteClient", {
          clientid: i.toString(),
          deleteusers: true,
        })
        .then(() => {
          console.log(`Client ${i} deleted sucessfully!`);
        })
        .catch((error) => {
          console.error(`Error deleting client ${i}:`, error);
        });
    }
    res.send({
      success: true,
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

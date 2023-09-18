function showAndHideUserBox() {
  let userBox = document.querySelector(".user-info");
  userBox.classList.toggle("hide-show")
}

function hideUserBox() {
  let userBox = document.querySelector(".user-info");
  userBox.classList.toggle("hide-show")
}
let input = document.querySelector(".section1 input");
let files = document.querySelector(".files");
let fileNames = document.querySelector(".file-names");
let upload_box = document.querySelector(".upload");

// input.addEventListener("change", function () {
//   upload_box.style.display = "flex";
//   document.body.style.overflow = "hidden";

//   // Clear any previously displayed file names
//   fileNames.innerHTML = '';

//   if (input.files.length > 0) {
//     // Iterate through all selected files and display their names
//     for (let i = 0; i < input.files.length; i++) {
//       const fileName = input.files[i].name;
//       const fileNameElement = document.createElement('p');
//       fileNameElement.textContent = fileName;
//       fileNames.appendChild(fileNameElement);
//     }
//   }
// });

// Get a reference to the storage service
let storage = firebase.storage();
let storageRef = storage.ref();
// Get a reference to the Firestore database
let db = firebase.firestore();
let filesCollection = db.collection('files'); // 'files' is the name of the collection


const auth = firebase.auth();
let loginUser;
window.addEventListener("load", () => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      loginUser = user;
      console.log("loginUser", loginUser);
      printUserDetail(loginUser);
    } else {
      console.log("user is not login");
    }
  });
});

// Inside the onSnapshot callback
filesCollection.onSnapshot(function (snapshot) {
  snapshot.docChanges().forEach(function (change) {
    if (change.type === 'added') {
      // Make sure loginUser is defined and not null
      if (loginUser) {
        let fileData = change.doc.data();
        if (fileData.userID === loginUser.uid) {
          // Rest of your code for displaying the file
          let fileName = fileData.name;
          let downloadURL = fileData.downloadURL;
          let fileID = change.doc.id;
          let fileRef = storageRef.child(fileName);
          let fileSize = fileData.size; // Assuming you have the file size in the Firestore data

          fileRef.getMetadata().then(function (metadata) {
            let modifiedTime = metadata.updated; // Get the modified time
            let fileTime = formatDate(modifiedTime);
            fileLastModifiedElement.textContent = fileTime + " me";

          }).catch(function (error) {
            console.error('Error fetching metadata:', error);
          });


          let fileItem = document.createElement('div');
          let showFileName = document.createElement("div");
          let fileDetails = document.createElement("div");
          let fileIcon = document.createElement("img");
          let fileNameElement = document.createElement("p");
          let fileOwnerElement = document.createElement("p");
          let fileLastModifiedElement  = document.createElement("p");
          let fileSizeElement = document.createElement("p");
          let fileActions = document.createElement("div");
          let deleteIcon = document.createElement("i");
          let downloadLink = document.createElement("a");
          let downloadIcon = document.createElement("i");


          fileItem.setAttribute("class", "file-item");
          fileItem.setAttribute("id", fileID);
          showFileName.setAttribute("class", "file-name");
          fileDetails.setAttribute("class", "file-details");
          fileIcon.setAttribute("src", "assets/file.png");
          fileActions.setAttribute("class", "file-actions");
          deleteIcon.setAttribute("class", "fa-solid fa-trash");
          deleteIcon.addEventListener('click', function () {
            deleteFile(fileID, fileName);
          });
          downloadIcon.setAttribute("class", "fa-solid fa-download");
          downloadLink.href = downloadURL;

          fileNameElement.textContent = fileName;
          fileOwnerElement.textContent = "me";
          fileSizeElement.textContent = formatBytes(fileSize);


          showFileName.appendChild(fileIcon);
          showFileName.appendChild(fileNameElement);
          fileDetails.appendChild(fileOwnerElement);
          fileDetails.appendChild(fileLastModifiedElement);
          fileDetails.appendChild(fileSizeElement);
          fileActions.appendChild(deleteIcon);
          downloadLink.appendChild(downloadIcon);
          fileActions.appendChild(downloadLink);
          fileItem.appendChild(showFileName);
          fileItem.appendChild(fileDetails);
          fileItem.appendChild(fileActions);
          files.appendChild(fileItem);
        }
      }
    }
  });
});

// Function to delete the file and its metadata

function uploadFile() {
  let fileInput = document.querySelector(".section1 input");
  let files = fileInput.files;

  if (files.length === 0) {
    alert("Please select one or more files to upload.");
    return;
  }

  let totalFiles = files.length;
  let filesUploaded = 0; // Keep track of the number of uploaded files

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let fileName = file.name;

    // Create a progress element for the current file
    let fileProgressElement = document.querySelectorAll(".file-names p")[i];

    // Check if a file with the same name and user already exists
    filesCollection
      .where('name', '==', fileName)
      .where('userID', '==', loginUser.uid)
      .get()
      .then((querySnapshot) => {
        if (!querySnapshot.empty) {
          // A file with the same name already exists for this user
          fileProgressElement.textContent = 'File "' + fileName + '" is already uploaded.';
        } else {
          // No file with the same name found, proceed with upload
          let fileRef = storageRef.child(fileName);

          // Upload the file to the storage reference
          let uploadTask = fileRef.put(file);

          // Set up a progress listener for each file
          uploadTask.on('state_changed',
            function (snapshot) {
              // Calculate the progress percentage
              let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

              // Update the progress element for the current file
              fileProgressElement.textContent = 'Uploading ' + fileName + '... ' + Math.floor(progress) + '%';
            },
            function (error) {
              console.error('Error:', error);
            },
            function () {
              // Upload completed for the current file
              console.log('File "' + fileName + '" uploaded successfully!');
              fileProgressElement.textContent = 'Upload complete for ' + fileName;
              fileProgressElement.style.color = "green";
              input.value = "";
              // Increase the count of uploaded files
              filesUploaded++;

              if (filesUploaded === totalFiles) {
                // All files have been uploaded, hide the upload_box
                upload_box.style.display = "none";
                document.body.style.overflow = "auto";
              }
              // Get the download URL for the uploaded file
              fileRef.getDownloadURL().then(function (downloadURL) {
                console.log('Download URL retrieved:', downloadURL);

                // Add the file metadata to Firestore collection
                return filesCollection.add({
                  name: file.name,
                  downloadURL: downloadURL,
                  size: file.size, // Assuming file size is stored in bytes
                  userID: loginUser.uid // Associate the user's UID with the file
                });
              }).then(function (docRef) {
                console.log('File metadata added to Firestore successfully! Document ID:', docRef.id);
              }).catch(function (error) {
                console.error('Error:', error);
              });
            }
          );
        }
      })
      .catch(function (error) {
        console.error('Error checking for existing file:', error);
      });
  }
}

function deleteFile(fileID, fileName) {
  // Delete from Firestore
  filesCollection.doc(fileID).delete()
    .then(function () {
      console.log('File metadata deleted from Firestore successfully!');
      // Delete from Storage
      let fileRef = storageRef.child(fileName);
      return fileRef.delete();
    })
    .then(function () {
      // Remove the UI element
      let fileItem = document.getElementById(fileID);
      files.removeChild(fileItem);
      console.log('File deleted from Firebase Storage successfully!');
    })
    .catch(function (error) {
      console.error('Error:', error);
    });
}


// Function to format date
function formatDate(timestamp) {
  let date = new Date(timestamp);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBytes(bytes, decimals = 0) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}


// Function to log out the user
function logoutUser() {
  firebase.auth().signOut().then(function () {
    // Redirect the user to the logout page or wherever you want
    window.location.href = "login.html";
  }).catch(function (error) {
    console.error('Error logging out:', error);
  });
}

function printUserDetail(loginUser) {
  let loginUserEmail = document.querySelector(".email");
  loginUserEmail.append(loginUser.email);
  let loginUserName = document.querySelector(".hi-user");
  loginUserName.textContent = loginUser.displayName;
}

// Select the button area by its class
let buttonArea = document.querySelector(".button-area");

// Add drag and drop event listeners to the button area
buttonArea.addEventListener("dragover", function (e) {
  e.preventDefault(); // Prevent the default behavior (open as link for some elements)
  buttonArea.classList.add("drag-over"); // Add a visual indication that files can be dropped
});

buttonArea.addEventListener("dragleave", function () {
  buttonArea.classList.remove("drag-over"); // Remove the visual indication when leaving the area
});

buttonArea.addEventListener("drop", function (e) {
  e.preventDefault(); // Prevent the default behavior (open as link for some elements)
  buttonArea.classList.remove("drag-over"); // Remove the visual indication

  // Access the dropped files
  let droppedFiles = e.dataTransfer.files;

  // Populate the input with the dropped files
  input.files = droppedFiles;

  // Handle the file selection (your existing code)
  handleFileSelection();
});


function handleFileSelection() {
  upload_box.style.display = "flex";
  document.body.style.overflow = "hidden";
  // Clear any previously displayed file names
  fileNames.innerHTML = '';

  if (input.files.length > 0) {
    // Iterate through all selected files and display their names
    for (let i = 0; i < input.files.length; i++) {
      const fileName = input.files[i].name;
      const fileNameElement = document.createElement('p');
      fileNameElement.textContent = fileName;
      fileNames.appendChild(fileNameElement);
    }
  }
}

// Add an event listener to the input for file selection
input.addEventListener("change", handleFileSelection);

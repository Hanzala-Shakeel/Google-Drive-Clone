const auth = firebase.auth();
window.addEventListener("load", () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            window.location.href = "index.html";
        } else {
            console.log("user is not login");
        }
    });
});

const googleSignInBtn = document.getElementById("googleSignInBtn");

googleSignInBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase
        .auth()
        .signInWithPopup(provider)
        .then((result) => {
            // Successful login
            const user = result.user;
            window.location.href = "index.html";
        })
        .catch((error) => {
            // Handle errors
            console.error(error);
        });
});
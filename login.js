const inputs = document.querySelectorAll(".input-field input");

inputs.forEach(input => {
    input.addEventListener("focus", () => {
        if(!input.parentElement.querySelector("label").classList.contains("shift-label")) {
            input.parentElement.querySelector("label").classList.toggle("shift-label");
        }
    });
    
    input.addEventListener("blur", () => {
        if(!input.value) {
            input.parentElement.querySelector("label").classList.toggle("shift-label");
        }
    });
});

const visibilityBtnOn = document.getElementById("visibility-btn-on");
const visibilityBtnOff = document.getElementById("visibility-btn-off");

visibilityBtnOn.addEventListener("click", () => {
    visibilityBtnOn.classList.toggle("hide");
    visibilityBtnOff.classList.toggle("hide");
    visibilityBtnOn.parentElement.querySelector("input#password").type = "text";
});

visibilityBtnOff.addEventListener("click", () => {
    visibilityBtnOn.classList.toggle("hide");
    visibilityBtnOff.classList.toggle("hide");
    visibilityBtnOff.parentElement.querySelector("input#password").type = "password";
});

// Grid logic
const animatedGrid = document.querySelector('.animated-grid');
const boxNumber = 900;
let boxesHTML;
for (let i = 0; i < boxNumber; i++) {
    boxesHTML += '<div class="box"></div>';
}
animatedGrid.innerHTML += boxesHTML;
const minDelay = 0;
const maxDelay = 10000;
const animatedGridBoxes = document.querySelectorAll('.animated-grid .box');
animatedGridBoxes.forEach(box => {
    box.classList.toggle('glow');
    const classAssignmentDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    box.style.animationDelay = `${classAssignmentDelay}ms`;
    const selectedColor = Math.floor(Math.random() * 16) + 1;
    setTimeout(() => {
        if(selectedColor === 1 || selectedColor === 2 || selectedColor === 3) {
            box.classList.add('box-glow');
        }
    }, classAssignmentDelay);
});

// JWT (Token) decryption
function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Log in Logic
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const insertAuthTokenIntoCookies = authToken => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    document.cookie = `authToken=${authToken}; expires=${expiryDate.toUTCString()}`;
}

const logIn = () => {
    const email = emailInput.value.toLowerCase();
    const password = passwordInput.value;
    fetch("https://task-manager-back-end-7gbe.onrender.com/api/user/login", {
        method: "POST",
        body: JSON.stringify({
          email: email,
          password: password
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then(res => res.json())
    .then(json => {
        if(json.status) {
            const authToken = json.data.authToken;
            insertAuthTokenIntoCookies(authToken);
            window.location.href = "app.html";
        }
        else {
            // alert("Email or Password is incorrect");
            alert(json.message);
        }
    }).catch(err => console.log(err))
}

const logInBtn = document.getElementById("log-in-btn");
logInBtn.addEventListener("click", logIn);

emailInput.addEventListener("keyup", e => {
    if(e.key === "Enter") {
        logIn();
    }
});
passwordInput.addEventListener("keyup", e => {
    if(e.key === "Enter") {
        logIn();
    }
});
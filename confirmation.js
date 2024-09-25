const confirmInstructions = document.getElementById("confirm-instructions");
const confirmAuthentication = document.getElementById("confirm-authentication");
const codeInput = document.getElementById("code-input");
const resendBtn = document.getElementById("resend-btn")

function isSixDigitNumber(input) {
    return /^\d{6}$/.test(input);
}

const switchScreens = () => {
    confirmInstructions.classList.toggle("hide");
    confirmAuthentication.classList.toggle("hide");
}

const deleteTokenFromCookies = (name) => {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
}

const authenticate = () => {

    if(isSixDigitNumber(codeInput.value)) {

        const key = codeInput.value;
    
        switchScreens();
    
        fetch("https://task-manager-back-end-7gbe.onrender.com/api/user/confirm", {
            method: "PATCH",
            body: JSON.stringify({
                confirm_key: key
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "verifyUserToken": `Bearer ${getVerifyUserTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then(json => {
            console.log(json);
            if(json.status) {
                const authToken = json.data.authToken;
    
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1);
    
                document.cookie = `authToken=${authToken}; expires=${expiryDate.toUTCString()}`;

                deleteTokenFromCookies("verifyUserToken");
    
                window.location.href = "app.html";
            }
            else {
                alert(json.message);
                switchScreens();
            }
        })
        .catch(err => console.log(err));
    }

    else {
        alert("Confirmation key must be six digits");
    }
}

codeInput.addEventListener("keydown", e => {
    if(e.key === "Enter") {authenticate()}
})

const transitionBetweenResendAndInput = () => {
    Array.from(confirmInstructions.children).forEach(element => {
        if(element.id != "resend-btn" && element.nodeName != "A") {
            element.classList.toggle("hide");
        }
    })
}

const getVerifyUserTokenFromCookies = () => {
    const tokenCookie = document.cookie.split('; ').find(cookie => cookie.startsWith('verifyUserToken='));
    const verifyUserToken = tokenCookie ? tokenCookie.split('=')[1] : null;
    return verifyUserToken;
}

const resendOTP = () => {
    if(!resendBtn.classList.contains("active")) {
        resendBtn.textContent = "Sending...";
        resendBtn.classList.add("active");
        transitionBetweenResendAndInput();
        fetch("https://task-manager-back-end-7gbe.onrender.com/api/user/resendotp", {
            method: "GET",
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "verifyUserToken": `Bearer ${getVerifyUserTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then(json => {
            if(json.status) {
                resendBtn.textContent = "Code was resent";
                resendBtn.classList.remove("active");
                transitionBetweenResendAndInput();
            }

            else {
                alert(json.message);
            }
        })
        .catch(err => console.log(err));
    }
}

resendBtn.addEventListener("click", resendOTP);
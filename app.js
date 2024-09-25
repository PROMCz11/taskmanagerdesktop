const taskContainer = document.getElementById("task-container");
const sideBar = document.getElementById("side-bar");
const application = document.querySelector(".application");
const loadingScreen = document.getElementById("loading-screen");
const firstNameDisplay = document.getElementById("first-name-tasks");
const statusDisplay = document.getElementById("status-display");
const body = document.querySelector("body");
const appearanceToggles = document.querySelectorAll(".settings-modal-grid .setting .circle");
const connectionStatus = document.getElementById("connection-status");
// const settingDisplayAutoDelete = document.getElementById("setting-display-auto-delete");

// -- Global Variables -- //
let taskArr = [];
let userFullName = "";
let userFirstName = "";
let email = "";
let appearance;
let auto_delete = 0;
let isClientOnline = 1;
let updatedWhileOfflineTasksArray = [];
let deletedWhileOfflineIDS = [];

// JWT (Token) decryption for the ( body / data / payLoad ) part
const parseJwt = (token) => {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
}

const updateConnectionStatusDisplay = connectionStatusLevel => {

    // level 0: Offline
    // level 1: Online
    // level 2: Sync

    switch (connectionStatusLevel) {
        case 0: // Offline
            connectionStatus.classList.remove("online");
            connectionStatus.classList.add("offline");
            connectionStatus.innerHTML = `<div class="circle"></div><p>Offline mode</p>`;
            break;
        
        case 1: // Online
            connectionStatus.classList.remove("offline");
            connectionStatus.classList.add("online");
            connectionStatus.innerHTML = `<div class="circle"></div><p>Online mode</p>`;
            break;
            
        case 2: // Sync
            connectionStatus.classList.remove("online");
            connectionStatus.classList.remove("offline");
            connectionStatus.classList.add("sync");
            connectionStatus.innerHTML = `<div><img src="assets/app/side-bar/sync-icon.svg" alt=""></div><p>Syncing</p>`;
            break;
    }
}

const enterOfflineMode = () => {
    updateConnectionStatusDisplay(0);
    isClientOnline = 0;
}

const enterOnlineMode = () => {
    enterSyncMode();
    const addArray = taskArr.filter(task => task._id.includes("-fake-id"));
    addArray.forEach(task => {
        delete task.UserId;
        delete task.__v;
        delete task.last_updated;
    });
    // console.log(addArray);
    fetch("https://task-manager-back-end-7gbe.onrender.com/api/offline", {
        method: "POST",
        body: JSON.stringify({
        //   token: getAuthTokenFromCookies(),
          addArray: addArray,
          updateArray: updatedWhileOfflineTasksArray.filter(task => !deletedWhileOfflineIDS.includes(task._id) && !task._id.includes("-fake-id")),
          deleteArray: deletedWhileOfflineIDS.filter(taskID => !taskID.includes("-fake-id"))
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Authorization": `Bearer ${getAuthTokenFromCookies()}`
        }
    })
    // The continuation has to be modified in order to get the id pairs and fix them
    .then(res => res.json())
    .then(json => {
        if(json.status) {
            updateConnectionStatusDisplay(1);
            isClientOnline = 1;
            // Distribute the array id pairs

            updatedWhileOfflineTasksArray = [];
            deletedWhileOfflineIDS = [];

            if(json.data) {

                const idPairsArray = json.data.idPairs;
                idPairsArray.forEach(pair => {
                    const fakeTaskIndex = taskArr.findIndex(task => task._id === pair.fakeID);
                    taskArr[fakeTaskIndex]._id = pair.realID;
                    if(document.getElementById(pair.fakeID)) {
                        const taskOnTheDOM = document.getElementById(pair.fakeID);
                        taskOnTheDOM.id = pair.realID;
                    }
                })
            }
        }
        else {
            // alert(json.message, "The page will be refreshed automatically");
            // window.location.href = "app.html";
            console.log(json.message);
        }
    })
    .catch(err => {
        enterOnlineMode(); // This was added to prevent an infinite sync loop in the case of connecting then immediately disconnecting from the internet (this seems to be the issue here but I'm not sure at all)
    })
}

const enterSyncMode = () => {
    updateConnectionStatusDisplay(2);
}

window.addEventListener("online", enterOnlineMode);
window.addEventListener("offline", enterOfflineMode);

const getDataFromServer = async () => {
    const res = await fetch("https://task-manager-back-end-7gbe.onrender.com/api/tasks", {
        method: "GET",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Authorization": `Bearer ${getAuthTokenFromCookies()}`
        }
    })
    const json = await res.json();
    if(json.status) {
        return json.data;
    }
    else {
        handleStatusReport(json.message, false);
        console.log("Error msg from the server: " + json.message);
    }
}

const distributeDataIntoClient = data => {
    taskArr = data.tasks.slice();
    userFullName = data.name;
    userFirstName = userFullName.split(" ")[0];
    email = data.email;
    appearance = data.appearance;
    auto_delete = data.auto_delete;
}

const getAuthTokenFromCookies = () => {
    const tokenCookie = document.cookie.split('; ').find(cookie => cookie.startsWith('authToken='));
    const authToken = tokenCookie ? tokenCookie.split('=')[1] : null;
    return authToken;
}

const updateUserInfoInSettings = () => {
    document.getElementById("setting-display-userFullname").textContent = userFullName;
    document.getElementById("setting-display-email").textContent = email;
    document.getElementById("setting-display-auto-delete").checked = auto_delete;
}

const switchViewBetweenLoadingScreenAndMainApplication = () => {
    loadingScreen.classList.toggle("hide");
    application.classList.toggle("hide");
}

const showUserFirstNameOnMainPage = () => {
    firstNameDisplay.textContent = `${userFirstName}'s Tasks`;
}

const getUserIDFromToken = () => parseJwt(getAuthTokenFromCookies()).UserId;

const renderTasksBasedOnActiveFilter = () => {
    filters.querySelectorAll("*").forEach(filter => {
        if(filter.classList.contains("active-filter")) {
            switch (true) {
                case filter.classList.contains("all-tasks-filter"):
                    renderTasks(filterTasks(taskArr, 0));
                    break;
                case filter.classList.contains("undone-tasks-filter"):
                    renderTasks(filterTasks(taskArr, 1));
                    break;
                case filter.classList.contains("important-tasks-filter"):
                    renderTasks(filterTasks(taskArr, 2));
                    break;
                case filter.classList.contains("completed-tasks-filter"):
                    renderTasks(filterTasks(taskArr, 3));
                    break;
            }
        }
    });
}

const reloadPage = () => {
    getDataFromServer()
    .then(data => {
        distributeDataIntoClient(data);

        renderTasksBasedOnActiveFilter();

        switchViewBetweenLoadingScreenAndMainApplication();
        updateAppearance(appearance);
        updateUserInfoInSettings();
        showUserFirstNameOnMainPage();
        handleStatusReport(`Welcome back ${userFirstName}`, true);
        if(isTaskContainerEmpty()) {
            taskContainer.textContent = noTaskPhrase;
        }

        // To be deleted
        const testingUserID = document.getElementById("testing-info__userID");
        testingUserID.textContent = "ID: " + getUserIDFromToken();
        // To be deleted

    }).catch(err => {
        if(!navigator.onLine) {
            handleStatusReport("We've entered offline mode", true); 
        }
        
        else {
            // handleStatusReport("Please log in", false);
            setTimeout(() => {
                window.location.href = "log-in.html";
            }, 2000);
            console.log(err)
        }
    })
}

const isValidEmail = email => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// To be changed - adding a universal phrase to indicate no tasks
const noTaskPhrase = "No tasks";

const isTaskContainerEmpty = () => {
    return !taskContainer.textContent.trim();
}

reloadPage();

const filterTasks = (tasks, level) => {

    // level 0 = all tasks
    // level 1 = undone
    // level 2 = important (Without the completed ones)
    // level 3 = completed

    switch (level) {
        case 0: return tasks;
        case 1: return tasks.filter(task => !task.completed);
        case 2: return tasks.filter(task => task.important && !task.completed);
        case 3: return tasks.filter(task => task.completed);
    }
}

const renderTasks = tasks => {
    taskContainer.innerHTML = tasks.reduce((acc, task) => {
        acc += `
            <div class="task-wrapper">
            <img class="delete-icon" src="assets/app/delete-icon.svg" alt="">
                <div title="Last updated: ${getFormattedLocalTime(task.last_updated)}" class="task ${task.completed ? "completed" : ""} ${task.important ? "important" : ""}" id="${task._id}">
                    <p contenteditable class="task-content">${task.content}</p>
                    <p class="task-date">${getFormattedLocalTime(task.date)}</p>
                    <div class="filter-indicators">
                        <div title="Mark as complete" class="circle completed-indicator"></div>
                        <div title="Mark as important" class="circle important-indicator"></div>
                    </div>
                </div>
                <img class="task-radio-unchecked" src="assets/app/task-radio-unchecked-icon.svg" alt="">
                <img class="task-radio-checked" src="assets/app/task-radio-checked-icon.svg" alt="">
            </div>
        `;
        return acc;
    }, '');
}

const getFormattedLocalTime = (millisecondsSinceEpoch) => {
    const dateFromMilliseconds = new Date(millisecondsSinceEpoch);
    const options = {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    const formattedLocalTime = dateFromMilliseconds.toLocaleTimeString(undefined, options).split(",").join("");
    return formattedLocalTime;
}

const handleStatusReport = (msg, status) => {
    statusDisplay.textContent = msg;
    if(status) {
        statusDisplay.classList.toggle("status-show-success");
        setTimeout(() => {
            statusDisplay.classList.toggle("status-show-success");
            setTimeout(() => {
                statusDisplay.textContent = '';
            }, 500);
        }, 1000);
    }
    else {
        statusDisplay.classList.toggle("status-show-fail");
        setTimeout(() => {
            statusDisplay.classList.toggle("status-show-fail");
        }, 1000);
    }
}

const generateFakeID = () => {
    let fakeID;
    do {
        fakeID = Math.floor(100000 + Math.random() * 900000);
    } while (taskArr.map(task => task._id).includes(fakeID));
    return fakeID;
}

const addTask = (content) => {

    const taskContent = content;
    const taskDate = new Date().getTime();
    const taskImportant = document.querySelector(".important-tasks-filter").classList.contains("active-filter") ? true : false;
    const taskCompleted = document.querySelector(".completed-tasks-filter").classList.contains("active-filter") ? true : false;
    const userID = getUserIDFromToken();

    taskInput.value = "";

    if(isClientOnline) {
    
        fetch("https://task-manager-back-end-7gbe.onrender.com/api/tasks/add", {
            method: "POST",
            body: JSON.stringify({
            //   token: getAuthTokenFromCookies(),
              content: taskContent,
              date: taskDate,
              important: taskImportant,
              completed: taskCompleted
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "Authorization": `Bearer ${getAuthTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then(json => {
            if(json.status) {
                const taskID = json.data.id;
                
                const addedTask = {
                    "_id": taskID,
                    "content": taskContent,
                    "date": taskDate,
                    "UserId": userID,
                    "important": taskImportant,
                    "completed": taskCompleted,
                    "__v": 0
                }
        
                taskArr.push(addedTask);
        
                if(taskContainer.innerHTML.trim() == noTaskPhrase) {
                    taskContainer.innerHTML = "";
                }
        
                renderNewTask(addedTask);
                
                // handleStatusReport("Task added successfully", true);
            }
            else {
                handleStatusReport(json.message, false);
                console.log(json.message);
            }
        })
        .catch(err => {
            handleStatusReport(err, false);
        })
    } else {
        const fakeID = generateFakeID() + "-fake-id";
        
        const addedTask = {
            "_id": fakeID,
            "content": taskContent,
            "date": taskDate,
            "UserId": userID,
            "important": taskImportant,
            "completed": taskCompleted,
            "__v": 0
        }

        taskArr.push(addedTask);

        if(taskContainer.innerHTML.trim() == noTaskPhrase) {
            taskContainer.innerHTML = "";
        }

        renderNewTask(addedTask);
    }
}

const renderNewTask = (task) => {
    const newTask = `
        <div class="task-wrapper">
            <img class="delete-icon" src="assets/app/delete-icon.svg" alt="">
            <div title="Last updated: ${getFormattedLocalTime(new Date().getTime())}" class="task ${document.querySelector(".important-tasks-filter").classList.contains("active-filter") ? "important" : ""} ${document.querySelector(".completed-tasks-filter").classList.contains("active-filter") ? "completed" : ""}" id="${task._id}">
                <p contenteditable class="task-content">${task.content}</p>
                <p class="task-date">${getFormattedLocalTime(task.date)}</p>
                <div class="filter-indicators">
                    <div title="Mark as complete" class="circle completed-indicator"></div>
                    <div title="Mark as important" class="circle important-indicator"></div>
                </div>
            </div>
                <img class="task-radio-unchecked" src="assets/app/task-radio-unchecked-icon.svg" alt="">
                <img class="task-radio-checked" src="assets/app/task-radio-checked-icon.svg" alt="">
        </div>
    `;
    taskContainer.innerHTML += newTask;
}

const taskInput = document.getElementById("task-input");
taskInput.addEventListener('keyup', e => {
    if(e.key === 'Enter'){
        if(taskInput.value !== '') {
            addTask(taskInput.value);
        }
        else handleStatusReport("Please enter task content", false);
    }
});

const fadeTaskOut = (task) => {
    const taskWrapper = task.parentElement;

    task.classList.toggle("task-fade-out-animation");
    setTimeout(() => {
        taskContainer.removeChild(taskWrapper);
    }, 300);
}

const deleteTaskFromClient = taskID => {

    if(!auto_delete) {
        const taskToBeDeletedElement = document.getElementById(taskID);
        fadeTaskOut(taskToBeDeletedElement);
    }

    else if(document.getElementById(taskID)) {
        fadeTaskOut(document.getElementById(taskID));
    }

    taskArr = taskArr.filter(task => task._id != taskID);
    handleStatusReport("Task deleted successfully", true);
    if(isTaskContainerEmpty()) {
        taskContainer.textContent = noTaskPhrase;
    }
}

const deleteTask = (taskID) => {
    if(isClientOnline) {
        fetch(`https://task-manager-back-end-7gbe.onrender.com/api/tasks/delete`, {
            method: "DELETE",
            body: JSON.stringify({
            //   token: getAuthTokenFromCookies(),
              ids: [taskID]
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "Authorization": `Bearer ${getAuthTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then((json) => {
            if(json.status) {
                deleteTaskFromClient(taskID);
            }
            else {
                handleStatusReport(json.message, false);
                console.log("Error msg:" + json.message)
            }
        })
        .catch(err => {
            handleStatusReport(err, false);
        });
    }
    else {
        if(!deletedWhileOfflineIDS.includes(taskID)) {
            deletedWhileOfflineIDS.push(taskID);
            deleteTaskFromClient(taskID);
        }
    }
}

const deleteTaskGroup = (ToBeDeletedTaskIDSArray) => {
    if(isClientOnline) {
        fetch(`https://task-manager-back-end-7gbe.onrender.com/api/tasks/delete`, {
            method: "DELETE",
            body: JSON.stringify({
            //   token: getAuthTokenFromCookies(),
              ids: ToBeDeletedTaskIDSArray
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "Authorization": `Bearer ${getAuthTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then((json) => {
            if(json.status) {
                ToBeDeletedTaskIDSArray.forEach(taskID => {deleteTaskFromClient(taskID)});
            }
            else {
                handleStatusReport(json.message, false);
                console.log(json.message);
            }
        })
        .catch(err => {
            handleStatusReport(err, false);
        });
    }
    else {
        ToBeDeletedTaskIDSArray.forEach(taskID => {
            if(!deletedWhileOfflineIDS.includes(taskID)) {
                deletedWhileOfflineIDS.push(taskID);
                deleteTaskFromClient(taskID);
            }
        });
    }
}

taskContainer.addEventListener("click", e => {
    const target = e.target;

    if(target.classList.contains("delete-icon")) {
        const taskID = target.parentElement.querySelector(".task").id;
        deleteTask(taskID);
    }

    else if(target.classList.contains("task-radio-checked") || target.classList.contains("task-radio-unchecked")) {

        const taskElement = target.parentElement.querySelector(".task");

        if(taskElement.classList.contains("completed")) {
            updateTask(taskElement.id, undefined, undefined, undefined, false);

            if(document.querySelector(".completed-tasks-filter").classList.contains("active-filter")) {
                fadeTaskOut(taskElement);
            }
        }
        else {
            if(auto_delete) {
                deleteTask(taskElement.id);
            }

            else {
                updateTask(taskElement.id, undefined, undefined, undefined, true);
            }
            
            if(document.querySelector(".undone-tasks-filter").classList.contains("active-filter") || document.querySelector(".important-tasks-filter").classList.contains("active-filter")) {
                fadeTaskOut(taskElement);
            }
        }
        taskElement.classList.toggle("completed");
    }

    else if(target.classList.contains("important-indicator")) {

        const taskElement = target.parentElement.parentElement;

        if(taskElement.classList.contains("important")) {
            updateTask(taskElement.id, undefined, undefined, false, undefined);

            if(document.querySelector(".important-tasks-filter").classList.contains("active-filter")) {
                fadeTaskOut(taskElement);
            }
        }
        else {
            updateTask(taskElement.id, undefined, undefined, true, undefined);
        }
        taskElement.classList.toggle("important");
    }

    else if(target.classList.contains("completed-indicator")) {

        const taskElement = target.parentElement.parentElement;

        if(taskElement.classList.contains("completed")) {
            updateTask(taskElement.id, undefined, undefined, undefined, false);
            
            if(document.querySelector(".completed-tasks-filter").classList.contains("active-filter")) {
                fadeTaskOut(taskElement);
            }
        }
        else {
            if(auto_delete) {
                deleteTask(taskElement.id);
            }

            else {
                updateTask(taskElement.id, undefined, undefined, undefined, true);
            }
            
            if(document.querySelector(".undone-tasks-filter").classList.contains("active-filter") || document.querySelector(".important-tasks-filter").classList.contains("active-filter")) {
                fadeTaskOut(taskElement);
            }
        }
        taskElement.classList.toggle("completed");
    }
});

const logOut = () => {
    deleteTokenFromCookies("authToken");
    window.location.href = "log-in.html";
}

const deleteTokenFromCookies = (name) => {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
}

const logOutBtn = document.getElementById("log-out-btn");

logOutBtn.addEventListener("click", logOut);


const updateTask = (taskID, content, date, important, completed) => {
    const last_updated = new Date().getTime();
    if(!(content === undefined)) {
        if(isClientOnline) {
            fetch(`https://task-manager-back-end-7gbe.onrender.com/api/tasks/update/${taskID}`, {
                method: "PATCH",
                body: JSON.stringify({
                    // token: getAuthTokenFromCookies(),
                    content: content,
                    last_updated: last_updated
                }),
                headers: {
                  "Content-type": "application/json; charset=UTF-8",
                  "Authorization": `Bearer ${getAuthTokenFromCookies()}`
                }
            })
            .then(res => res.json())
            .then((json) => {
                if(json.status) {
                    // handleStatusReport("Task updated successfully", true);
                    const index = taskArr.findIndex(task => task._id === taskID);
                    taskArr[index].content = content;
                    taskArr[index].last_updated = last_updated;
                    document.getElementById(taskArr[index]._id).title = "Last updated: " + getFormattedLocalTime(last_updated);
                }
                else {
                    handleStatusReport(json.message, false);
                    console.log(json.message);
                }
            })
            .catch(err => {
                handleStatusReport(err, false);
            })
        }
        else {
            const index = taskArr.findIndex(task => task._id === taskID);
            taskArr[index].content = content;
            taskArr[index].last_updated = last_updated;
            document.getElementById(taskArr[index]._id).title = "Last updated: " + getFormattedLocalTime(last_updated);
            
            const indexOfPreviouslyUpdatedTask = updatedWhileOfflineTasksArray.findIndex(task => task._id === taskID);
            if(indexOfPreviouslyUpdatedTask === -1) {
                const newUpdatedTask = {
                    "_id": taskID,
                    "content": content,
                    "last_updated": last_updated
                }
                updatedWhileOfflineTasksArray.push(newUpdatedTask);
            }
            else {
                updatedWhileOfflineTasksArray[indexOfPreviouslyUpdatedTask].content = content;
                updatedWhileOfflineTasksArray[indexOfPreviouslyUpdatedTask].last_updated = last_updated;
            }
        }
    }
    if(!(date === undefined)) {
        // fetch(`https://task-manager-back-end-7gbe.onrender.com/api/tasks/update/${taskID}`, {
        //     method: "PATCH",
        //     body: JSON.stringify({
        //         token: getAuthTokenFromCookies(),
        //         date: date
        //     }),
        //     headers: {
        //       "Content-type": "application/json; charset=UTF-8"
        //     }
        // })
        // .then(() => {
        //     handleStatusReport("Task updated successfully", true);
        //     const index = taskArr.findIndex(task => task._id === taskID);
        //     taskArr[index].date = date;
        // })
        // .catch(err => {
        //     handleStatusReport("Updating task failed", false);
        // })
        console.log("Editing taks date is disabled for the moment");
    }
    if(!(important === undefined)) {
        if(isClientOnline) {
            fetch(`https://task-manager-back-end-7gbe.onrender.com/api/tasks/update/${taskID}`, {
                method: "PATCH",
                body: JSON.stringify({
                    // token: getAuthTokenFromCookies(),
                    important: important,
                    last_updated: last_updated
                }),
                headers: {
                  "Content-type": "application/json; charset=UTF-8",
                  "Authorization": `Bearer ${getAuthTokenFromCookies()}`
                }
            })
            .then(res => res.json())
            .then((json) => {
                if(json.status) {
                    // handleStatusReport("Task updated successfully", true);
                    const index = taskArr.findIndex(task => task._id === taskID);
                    taskArr[index].important = important;
                    taskArr[index].last_updated = last_updated;
                    if(document.getElementById(taskArr[index]._id)) {
                        // This was added to account for the element disappearing from the container, in cases such as the important leaving the important filter after being unmarked
                        document.getElementById(taskArr[index]._id).title = "Last updated: " + getFormattedLocalTime(last_updated);
                    }
                }
                else {
                    handleStatusReport(json.message, false);
                    console.log(json.message, false);
                }
            })
            .catch(err => {
                handleStatusReport(err, false);
            })
        }
        else {
            const index = taskArr.findIndex(task => task._id === taskID);
            taskArr[index].important = important;
            taskArr[index].last_updated = last_updated;
            if(document.getElementById(taskArr[index]._id)) {
                // This was added to account for the element disappearing from the container, in cases such as the important leaving the important filter after being unmarked
                document.getElementById(taskArr[index]._id).title = "Last updated: " + getFormattedLocalTime(last_updated);
            }
            
            const indexOfPreviouslyUpdatedTask = updatedWhileOfflineTasksArray.findIndex(task => task._id === taskID);
            if(indexOfPreviouslyUpdatedTask === -1) {
                const newUpdatedTask = {
                    "_id": taskID,
                    "important": important,
                    "last_updated": last_updated
                }
                updatedWhileOfflineTasksArray.push(newUpdatedTask);
            }
            else {
                updatedWhileOfflineTasksArray[indexOfPreviouslyUpdatedTask].important = important;
                updatedWhileOfflineTasksArray[indexOfPreviouslyUpdatedTask].last_updated = last_updated;
            }
        }
    }
    if(!(completed === undefined)) {
        if(isClientOnline) {
            fetch(`https://task-manager-back-end-7gbe.onrender.com/api/tasks/update/${taskID}`, {
                method: "PATCH",
                body: JSON.stringify({
                    // token: getAuthTokenFromCookies(),
                    completed: completed,
                    last_updated: last_updated
                }),
                headers: {
                  "Content-type": "application/json; charset=UTF-8",
                  "Authorization": `Bearer ${getAuthTokenFromCookies()}`
                }
            })
            .then(res => res.json())
            .then((json) => {
                if(json.status) {
                    // handleStatusReport("Task updated successfully", true);
                    const index = taskArr.findIndex(task => task._id === taskID);
                    taskArr[index].completed = completed;
                    taskArr[index].last_updated = last_updated;
                    if(document.getElementById(taskArr[index]._id)) {
                        // This was added to account for the element disappearing from the container, in cases such as the important leaving the important filter after being unmarked
                        document.getElementById(taskArr[index]._id).title = "Last updated: " + getFormattedLocalTime(last_updated);
                    }
                }
                else {
                    handleStatusReport(json.message, false);
                }
            })
            .catch(err => {
                handleStatusReport(err, false);
            })
        } else {
            // handleStatusReport("Task updated successfully", true);
            const index = taskArr.findIndex(task => task._id === taskID);
            taskArr[index].completed = completed;
            taskArr[index].last_updated = last_updated;
            if(document.getElementById(taskArr[index]._id)) {
                // This was added to account for the element disappearing from the container, in cases such as the important leaving the important filter after being unmarked
                document.getElementById(taskArr[index]._id).title = "Last updated: " + getFormattedLocalTime(last_updated);
            }
            
            const indexOfPreviouslyUpdatedTask = updatedWhileOfflineTasksArray.findIndex(task => task._id === taskID);
            if(indexOfPreviouslyUpdatedTask === -1) {
                const newUpdatedTask = {
                    "_id": taskID,
                    "completed": completed,
                    "last_updated": last_updated
                }
                updatedWhileOfflineTasksArray.push(newUpdatedTask);
            }
            else {
                updatedWhileOfflineTasksArray[indexOfPreviouslyUpdatedTask].completed = completed;
                updatedWhileOfflineTasksArray[indexOfPreviouslyUpdatedTask].last_updated = last_updated;
            }
        }
    }
}

taskContainer.addEventListener("click", e => {
    const target = e.target;
    if(target.classList.contains("task-content") && (!target.classList.contains("has-event-listener"))) {
        target.classList.add("has-event-listener");
        target.addEventListener("blur", () => {
            updateTask(target.parentElement.id, target.textContent, undefined, undefined, undefined);
        });
        target.addEventListener("keydown", e => {
            if(e.key === 'Enter') {
                e.preventDefault();
                target.blur();
            }
        });
    }
});

const filters = document.getElementById("filters");

const activateFilter = filterToActivate => {
    const allFilters = Array.from(filterToActivate.parentElement.children);
    allFilters.forEach(filter => {
        filter.classList.remove("active-filter");
    })
    filterToActivate.classList.add("active-filter");
    if(isTaskContainerEmpty()) {
        taskContainer.textContent = noTaskPhrase;
    }
}

filters.addEventListener("click", e => {
    const target = e.target;
    switch (true) {
        case target.classList.contains("all-tasks-filter"):
            renderTasks(filterTasks(taskArr, 0));
            activateFilter(target);
            break;
        case target.classList.contains("undone-tasks-filter"):
            renderTasks(filterTasks(taskArr, 1));
            activateFilter(target);
            break;
        case target.classList.contains("important-tasks-filter"):
            renderTasks(filterTasks(taskArr, 2));
            activateFilter(target);
            break;
        case target.classList.contains("completed-tasks-filter"):
            renderTasks(filterTasks(taskArr, 3));
            activateFilter(target);
            break;
    }
});

const settingsModalWrapper = document.getElementById("settings-modal-wrapper");
const settingsModal = document.getElementById("settings-modal");
const closeSettingsModalBtn = document.getElementById("close-settings-modal-btn");
const openSettingsModalBtn = document.getElementById("open-settings-modal-btn");

const turnOffSetting = (button, input) => {
    button.textContent = "Edit";
    input.style.color = "#757575";
    input.contentEditable = false;
    input.classList.remove("active-setting-input");
}

const settingsUpdateUserName = (input) => {
    const newName = input.textContent.trim();
    if(newName.split(" ").length != 2 || !newName) {
        handleStatusReport("Name has to be two words", false);
    }
    else {
        fetch(`https://task-manager-back-end-7gbe.onrender.com/api/user/update`, {
            method: "PATCH",
            body: JSON.stringify({
                // token: getAuthTokenFromCookies(),
                name: newName
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "Authorization": `Bearer ${getAuthTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then((json) => {
            if(json.status) {
                handleStatusReport("Username saved", true);
                userFullName = newName;
                userFirstName = userFullName.split(" ")[0];
                showUserFirstNameOnMainPage();
            }
            else {
                handleStatusReport(json.message, false);
                console.log(json.message);
            }
        })
        .catch(err => handleStatusReport(err, false));
    }
}

const settingsUpdateEmail = (input) => {
    const newEmail = input.textContent.trim().toLowerCase();
    if(isValidEmail(newEmail)) {
        fetch(`https://task-manager-back-end-7gbe.onrender.com/api/user/update`, {
            method: "PATCH",
            body: JSON.stringify({
                // token: getAuthTokenFromCookies(),
                email: newEmail
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "Authorization": `Bearer ${getAuthTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then((json) => {
            if(json.status) {
                handleStatusReport("Email saved", true);
                email = newEmail;
            }
            else {
                handleStatusReport(json.message, false);
                console.log(json.message);
            }
        })
        .catch(err => handleStatusReport(err, false));
    }
    else {
        handleStatusReport("Enter a valid Email", false);
    }
}

const insertAuthTokenIntoCookies = authToken => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    document.cookie = `authToken=${authToken}; expires=${expiryDate.toUTCString()}`;
}

const settingsUpdatePassword = (input) => {
    const newPassword = input.textContent.trim();
    if(newPassword == "") {
        handleStatusReport("Password can't be empty", false)
    }
    else {
        fetch(`https://task-manager-back-end-7gbe.onrender.com/api/user/update`, {
            method: "PATCH",
            body: JSON.stringify({
                // token: getAuthTokenFromCookies(),
                password: newPassword
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "Authorization": `Bearer ${getAuthTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then((json) => {
            if(json.status) {
                const newAuthToken = json.data.authToken;
                insertAuthTokenIntoCookies(newAuthToken);
                getDataFromServer();
                handleStatusReport("Password saved", true);
                input.textContent = input.textContent.trim().split("").map(char => "*").join("");
            }
            else {
                handleStatusReport(json.message, false);
                console.log(json.message);
            }
        })
        .catch(err => handleStatusReport(err, false));
    }
}

const settingsUpdateAutoDelete = () => {

    fetch(`https://task-manager-back-end-7gbe.onrender.com/api/user/update`, {
        method: "PATCH",
        body: JSON.stringify({
            // token: getAuthTokenFromCookies(),
            auto_delete: auto_delete
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Authorization": `Bearer ${getAuthTokenFromCookies()}`
        }
    })
    .then(res => res.json())
    .then((json) => {
        if(json.status) {
            handleStatusReport("Auto delete preferance updated successfully", true);
        }
        else {
            handleStatusReport(json.message, false);
            console.log(json.message);
        }
    })
    .catch(err => handleStatusReport(err, false));
}

const settingsUpdateUserDeleteAccount = (password) => {

    fetch(`https://task-manager-back-end-7gbe.onrender.com/api/user/delete`, {
        method: "DELETE",
        body: JSON.stringify({
            // token: getAuthTokenFromCookies(),
            password: password
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Authorization": `Bearer ${getAuthTokenFromCookies()}`
        }
    })
    .then(res => res.json())
    .then((json) => {
        if(json.status) {
            // window.location.href = "log-in.html";
            logOut();
        }
        else {
            handleStatusReport(json.message, false);
            console.log(json.message);
        }
    })
    .catch(err => handleStatusReport(err, false));
}

const turnOnSetting = (button, input) => {
    input.classList.add("active-setting-input");
    button.textContent = "Save";
    input.contentEditable = true;
    input.style.color = "white";
    input.focus();
    document.execCommand("selectAll", false, null);
    input.addEventListener("keydown", e => {
        if(e.key === "Enter") {
            e.preventDefault();
            if(input.id === "setting-display-userFullname") {
                settingsUpdateUserName(input);
                turnOffSetting(button, input);
            }
            else if(input.id === "setting-display-email") {
                settingsUpdateEmail(input);
                turnOffSetting(button, input);
            }
            else if(input.id === "setting-display-password") {
                settingsUpdatePassword(input);
                turnOffSetting(button, input);
            }
        }
    });
}

settingsModalWrapper.addEventListener("click", e => {
    const target = e.target;
    if(target === closeSettingsModalBtn) {
        settingsModalWrapper.classList.toggle("hide");
    }
    else if(target === settingsModalWrapper) {
        settingsModalWrapper.classList.toggle("hide");
    }

    else if(target.classList.contains("edit-setting-btn-userFullname")) {
        const input = document.getElementById("setting-display-userFullname");
        if(input.classList.contains("active-setting-input")) {
            settingsUpdateUserName(input);
            turnOffSetting(target, input);
        }
        else {
            turnOnSetting(target, input);
        }
    }

    else if(target.classList.contains("edit-setting-btn-email")) {
        const input = document.getElementById("setting-display-email");
        if(input.classList.contains("active-setting-input")) {
            settingsUpdateEmail(input);
            turnOffSetting(target, input);
        }
        else {
            turnOnSetting(target, input);
        }
    }

    else if(target.classList.contains("edit-setting-btn-password")) {
        const input = document.getElementById("setting-display-password");
        if(input.classList.contains("active-setting-input")) {
            settingsUpdatePassword(input);
            turnOffSetting(target, input);
        }
        else {
            turnOnSetting(target, input);
        }
    }

    else if(target.classList.contains("circle")) {
        const appearanceCode = parseInt(target.getAttribute("data-appearance-code"));
        updateAppearance(appearanceCode);
        fetch(`https://task-manager-back-end-7gbe.onrender.com/api/user/update`, {
            method: "PATCH",
            body: JSON.stringify({
                // token: getAuthTokenFromCookies(),
                appearance: appearanceCode
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
              "Authorization": `Bearer ${getAuthTokenFromCookies()}`
            }
        })
        .then(res => res.json())
        .then((json) => {
            if(json.status) {
                handleStatusReport("Appearance Updated", true);
            }
            else {
                handleStatusReport(json.message, false);
                console.log(json.message);
            }
        })
        .catch(err => handleStatusReport(err, false));
    }

    else if(target.id === "setting-display-auto-delete") {
        if(target.checked) {
            auto_delete = 1;
            settingsUpdateAutoDelete();
        }

        else {
            auto_delete = 0;
            settingsUpdateAutoDelete();
        }
    }

    else if(target.classList.contains("delete-completed-tasks-btn")) {
        const completedTasksIDS = filterTasks(taskArr, 3).map(task => task._id);
        deleteTaskGroup(completedTasksIDS);
    }

    else if(target.classList.contains("delete-all-tasks-btn")) {
        const allTasksIDS = taskArr.map(task => task._id);
        deleteTaskGroup(allTasksIDS);
    }

    else if(target.classList.contains("delete-account-btn")) {
        const deleteAccountModal = settingsModal.querySelector(".delete-account-modal");
        deleteAccountModal.classList.remove("hide");
        const confirmPasswordInput = deleteAccountModal.querySelector(".confirm-password-input");
        deleteAccountModal.addEventListener("click", e => {
            const target = e.target;

            if(target.classList.contains("confirm-delete-account-btn")) {
                const password = confirmPasswordInput.value.trim();
                password ? settingsUpdateUserDeleteAccount(password) : alert("Please provide a password to confirm deleting your account");
            }
            else if(target.classList.contains("cancel-delete-account-btn")) {
                deleteAccountModal.classList.add("hide");
            }
        })
    }
});

const removeAllAppearanceCLassesFromBody = () => {
    body.classList = Array.from(body.classList).filter(bodyClass => !bodyClass.includes("appearance-"));
}

const removeActiveClassFromAllAppearanceToggles = () => {
    appearanceToggles.forEach(toggle => {
        toggle.classList.remove("active");
    });
}

const changeBodyClassAndActivateAppearanceToggle = (bodyClass, appearanceCode) => {
    body.classList.add(bodyClass);
    appearanceToggles[appearanceCode - 1].classList.add("active");
}

const updateAppearance = appearanceCode => {

    removeAllAppearanceCLassesFromBody();

    removeActiveClassFromAllAppearanceToggles();

    switch (appearanceCode) {
        case 2:
            changeBodyClassAndActivateAppearanceToggle("appearance-light-blue", appearanceCode);
            break;
        case 3:
            changeBodyClassAndActivateAppearanceToggle("appearance-purple", appearanceCode);
            break;
        case 4:
            changeBodyClassAndActivateAppearanceToggle("appearance-pink", appearanceCode);
            break;
        case 5:
            changeBodyClassAndActivateAppearanceToggle("appearance-orange", appearanceCode);
            break;
        case 6:
            changeBodyClassAndActivateAppearanceToggle("appearance-blue", appearanceCode);
            break;
        case 7:
            changeBodyClassAndActivateAppearanceToggle("appearance-scarlet", appearanceCode);
            break;
        case 8:
            changeBodyClassAndActivateAppearanceToggle("appearance-grape", appearanceCode);
            break;
        case 9:
            changeBodyClassAndActivateAppearanceToggle("appearance-baby-pink", appearanceCode);
            break;
        case 10:
            changeBodyClassAndActivateAppearanceToggle("appearance-silver", appearanceCode);
            break;
    }

}

sideBar.addEventListener("click", e => {
    const target = e.target;
    if(target === openSettingsModalBtn || target.parentElement === openSettingsModalBtn) {
        settingsModalWrapper.classList.toggle("hide");
    }
});

const logoContainer = document.getElementById("logo-container");

logoContainer.addEventListener("click", () => {window.location.href = "index.html"});

const isMobilePlatform = () => {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};

if(isMobilePlatform()) {
    window.location.href = `https://svelteinitpractice.pages.dev?authToken=${getAuthTokenFromCookies()}`;
}
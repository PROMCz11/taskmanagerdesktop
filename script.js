const taskInput = document.getElementById("task-input");
const taskContainer = document.getElementById("task-container");
const statusDisplay = document.getElementById("status-display");
const loadingScreen = document.getElementById("loading-screen");
const main = document.querySelector("main");

let taskArr = [];
let userName = "";

// const getTasksFromServer = async () => {
//     const res = await fetch("https://task-manager-back-end-7gbe.onrender.com/api/tasks");
//     const json = await res.json();
//     taskArr = json.data.tasks.slice();
//     return json.data.tasks;
// }

const getTasksFromServer = async () => {
    const res = await fetch("https://task-manager-back-end-7gbe.onrender.com/api/tasks", {
        method: "POST",
        body: JSON.stringify({
            token: getTokenFromCookies()
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
    })
    const json = await res.json();
    taskArr = json.data.tasks.slice();
    userName = json.data.name;
    return json.data.tasks;
}

const getTokenFromCookies = () => {
    const tokenCookie = document.cookie.split('; ').find(cookie => cookie.startsWith('token='));
    const token = tokenCookie ? tokenCookie.split('=')[1] : null;
    return token;
}

const reloadPage = () => {
    getTasksFromServer().then(p => {
        renderTasks(p);
        loadingScreen.classList.toggle("hide");
        main.classList.toggle("hide");
        handleStatusReport("Welcome!", true);
        checkEmptyContainer();
    }).catch(err => {
        handleStatusReport("No Connection", false);
    })
}

reloadPage();

const renderTasks = tasks => {
    taskContainer.innerHTML = tasks.reduce((acc, task) => {
        acc += `
            <div class="task">
                <p class="id">${task._id}</p>
                <p class="task-content">${task.content}</p>
                <p class="task-date">${task.date}</p>
                <div class="delete-layer">
                    Delete
                </div>
            </div>
        `;
        return acc;
    }, '');
}

const checkEmptyContainer = () => {
    if(!taskArr.length) {
        taskContainer.textContent = "No Tasks";
    }
}

const handleStatusReport = (msg, status) => {
    statusDisplay.textContent = msg;
    if(status) {
        statusDisplay.classList.toggle("status-show-success");
        setTimeout(() => {
            statusDisplay.classList.toggle("status-show-success");
        }, 1000);
    }
    else {
        statusDisplay.classList.toggle("status-show-fail");
        setTimeout(() => {
            statusDisplay.classList.toggle("status-show-fail");
        }, 1000);
    }
}

const addTask = (content) => {
    taskInput.value = "";
    const dateObj = new Date();
    fetch("https://task-manager-back-end-7gbe.onrender.com/api/addtask", {
        method: "POST",
        body: JSON.stringify({
          token: getTokenFromCookies(),
          content: content,
          date: dateObj.toLocaleTimeString()
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then(getTasksFromServer)
    .then(tasks => {
        const addedTask = tasks[tasks.length - 1]
        renderNewTask(addedTask);
        handleStatusReport("Task added successfully", true);
    })
}

const renderNewTask = (task) => {
    if(taskArr.length == 1) {
        taskContainer.textContent = "";
    }
    const newTask = `
        <div class="task">
            <p class="id">${task._id}</p>
            <p class="task-content">${task.content}</p>
            <p class="task-date">${task.date}</p>
            <div class="delete-layer">
                Delete
            </div>
        </div>
    `;
    taskContainer.innerHTML += newTask;
}

// const deleteTask = (taskID, taskIndex) => {
//     fetch(`https://task-manager-back-end-7gbe.onrender.com/api/deletetask/${taskID}`, { method: 'DELETE' })
//     .then(() => {
//         taskContainer.removeChild(taskContainer.children[taskIndex]);
//         taskArr = taskArr.filter(task => task._id != taskID);
//         handleStatusReport("Task deleted successfully", true);
//         checkEmptyContainer();
//     })
// }

const deleteTask = (taskID, taskIndex) => {
    fetch(`https://task-manager-back-end-7gbe.onrender.com/api/deletetask/${taskID}`, {
        method: "DELETE",
        body: JSON.stringify({
          token: getTokenFromCookies()
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then(() => {
        taskContainer.removeChild(taskContainer.children[taskIndex]);
        taskArr = taskArr.filter(task => task._id != taskID);
        handleStatusReport("Task deleted successfully", true);
        checkEmptyContainer();
    })
}

taskContainer.addEventListener("click", e => {
    const target = e.target;
    if(target.classList.contains("delete-layer")) {
        const taskIndex = Array.from(taskContainer.children).indexOf(e.target.parentElement);
        const taskID = taskArr[taskIndex]._id;
        deleteTask(taskID, taskIndex);
    }
});

taskInput.addEventListener('keyup', e => {
    if(e.key === 'Enter'){
        addTask(taskInput.value);
    }
});
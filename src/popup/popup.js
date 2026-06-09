function getState(query) {
  return new Promise((resolve) => {
    chrome.storage.local.get(query, function (result) {
      resolve(result);
    });
  });
}

function sendMessage(message) {
  return new Promise((resolve) => {
    message = JSON.parse(JSON.stringify(message));
    chrome.runtime.sendMessage(message, function (result) {
      resolve(result);
    });
  });
}

async function init() {
  let state = await getState(null);

  let buttonPower = document.querySelector(".button-power");
  let buttonText = document.querySelector(".button-power-text");

  if (state.active) {
    buttonPower.removeAttribute('inactive');
    buttonText.innerText = "Enabled";
  } else {
    buttonPower.setAttribute('inactive', 'inactive');
    buttonText.innerText = "Disabled";
  }

  buttonPower.addEventListener("click", async () => {
    state.active = !state.active;
    if (state.active) {
      buttonPower.removeAttribute('inactive');
      buttonText.innerText = "Enabled";
    } else {
      buttonPower.setAttribute('inactive', 'inactive');
      buttonText.innerText = "Disabled";
    }
    await sendMessage({ action: "update", state: state });
  });
}

init();

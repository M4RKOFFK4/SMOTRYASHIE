// game.js — рабочая версия с альтернативным видео камеры 01 и камеры 02

const cameras = [
  {
    name: "КАМЕРА 01",
    location: "ГЛАВНЫЕ ВОРОТА",
    video: "assets/videos/camera-01.mp4"
  },
  {
    name: "КАМЕРА 02",
    location: "ЛЕСНАЯ ТРОПА",
    video: "assets/videos/camera-02.mp4"
  },
  {
    name: "КАМЕРА 03",
    location: "СТАРЫЙ МОСТ",
    video: "assets/videos/camera-03.mp4"
  },
  {
    name: "КАМЕРА 04",
    location: "СТОРОЖЕВАЯ ВЫШКА",
    video: "assets/videos/camera-04.mp4"
  },
  {
    name: "КАМЕРА 05",
    location: "СЕВЕРНЫЙ ЛЕС",
    video: "assets/videos/camera-05.mp4"
  },
  {
    name: "КАМЕРА 06",
    location: "ЗАБРОШЕННЫЙ ДОМ",
    video: "assets/videos/camera-06.mp4"
  },
  {
    name: "КАМЕРА 07",
    location: "ОЗЕРО",
    video: "assets/videos/camera-07.mp4"
  },
  {
    name: "КАМЕРА 08",
    location: "ЗАПАДНАЯ ГРАНИЦА",
    video: "assets/videos/camera-08.mp4"
  }
];

// Состояние камер
let currentCamera = 0;
let currentRound = 1;
const totalCameras = cameras.length;
let records = [];

// Альтернативное видео камеры 01
const STORAGE_KEY_ALT_COMPLETED = "ranger_cam1_alt_completed";
const CAMERA1_ALT_VIDEO = "assets/videos/camera-01-alt.mp4";

let altActive = false;
let altCompleted = false;

// Альтернативное видео камеры 02
const CAMERA2_ALT_VIDEO = "assets/videos/camera-02-alt.mp4";
let camera2AltActive = false;

try {
  altCompleted =
    localStorage.getItem(STORAGE_KEY_ALT_COMPLETED) === "1";
} catch (error) {
  altCompleted = false;
}

document.addEventListener("DOMContentLoaded", () => {
  const cameraVideo = document.getElementById("cameraVideo");
  const videoPlaceholder = document.getElementById("videoPlaceholder");

  const cameraName = document.getElementById("cameraName");
  const cameraLocation = document.getElementById("cameraLocation");
  const cameraTime = document.getElementById("cameraTime");
  const statusText = document.getElementById("statusText");

  const previousButton = document.getElementById("previousButton");
  const nextButton = document.getElementById("nextButton");
  const recordButton = document.getElementById("recordButton");

  const cameraList = document.getElementById("cameraList");
  const logList = document.getElementById("logList");
  const clearLogButton = document.getElementById("clearLogButton");

  const anomalyModal = document.getElementById("anomalyModal");
  const anomalyForm = document.getElementById("anomalyForm");
  const anomalyCountInput = document.getElementById("anomalyCount");
  const anomalyTimeInput = document.getElementById("anomalyTime");
  const anomalyDescInput = document.getElementById("anomalyDescription");
  const anomalyCancel = document.getElementById("anomalyCancel");

  const rangerMessageButton =
    document.getElementById("rangerMessageButton");
  const rangerMessageWindow =
    document.getElementById("rangerMessageWindow");
  const closeRangerMessageButton =
    document.getElementById("closeRangerMessageButton");

  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  const backgroundMusic =
    document.getElementById("backgroundMusic");
  const buttonClickSound =
    document.getElementById("buttonClickSound");

  function showToast(
    message = "ОТЧЁТ ОТПРАВЛЕН",
    milliseconds = 3000
  ) {
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.classList.add("show");

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
      toastTimer = null;
    }, milliseconds);
  }

  function escapeHtml(value) {
    const text = value == null ? "" : String(value);

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function updateClock() {
    if (!cameraTime) return;

    cameraTime.textContent = new Date().toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    );
  }

  setInterval(updateClock, 1000);
  updateClock();

  function renderCameraList() {
    if (!cameraList) return;

    cameraList.innerHTML = "";

    cameras.forEach((camera, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "camera-list-item";

      if (index === currentCamera) {
        button.classList.add("active");
      }

      button.textContent =
        `${camera.name} — ${camera.location}`;

      button.addEventListener("click", () => {
        changeCamera(index);
      });

      cameraList.appendChild(button);
    });
  }

  function renderLog() {
    if (!logList) return;

    logList.innerHTML = "";

    if (!records.length) {
      logList.innerHTML =
        '<p class="empty-log">Аномалий пока не обнаружено.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    records.forEach((record) => {
      const item = document.createElement("div");

      item.className = "log-entry";
      item.innerHTML = `
        <div class="log-meta">
          <strong>#${escapeHtml(record.count)}</strong>
          <span style="color:#f7e98b; margin-left:8px;">
            ${escapeHtml(record.time)}
          </span>
          —
          <em style="color:#bde6c6; margin-left:8px;">
            ${escapeHtml(record.camera)}
          </em>
        </div>
        <div class="log-desc">
          ${escapeHtml(record.description)}
        </div>
      `;

      fragment.appendChild(item);
    });

    logList.appendChild(fragment);
  }

  async function startCurrentVideo() {
    if (!cameraVideo) return;

    try {
      await cameraVideo.play();

      if (statusText) {
        statusText.textContent = "СИГНАЛ ПОДКЛЮЧЁН";
      }
    } catch (error) {
      console.warn("Автозапуск видео не удался:", error);

      if (statusText) {
        statusText.textContent =
          "НАЖМИТЕ НА ЭКРАН ДЛЯ ЗАПУСКА";
      }
    }
  }

  function getCurrentVideoPath() {
    const camera = cameras[currentCamera];

    if (!camera) return "";

    // Альтернативное видео камеры 02:
    // только на 4-м круге и только пока открыта камера 02.
    if (currentCamera === 1 && camera2AltActive) {
      return CAMERA2_ALT_VIDEO;
    }

    // Альтернативное видео камеры 01.
    if (currentCamera === 0 && altActive) {
      return CAMERA1_ALT_VIDEO;
    }

    return camera.video || "";
  }

  function showCamera() {
    const camera = cameras[currentCamera];

    if (!camera) return;

    if (cameraName) {
      cameraName.textContent = camera.name || "";
    }

    if (cameraLocation) {
      cameraLocation.textContent = camera.location || "";
    }

    if (cameraVideo) {
      const newSource = getCurrentVideoPath();
      const currentSource =
        cameraVideo.getAttribute("src");

      if (currentSource !== newSource) {
        try {
          cameraVideo.pause();
        } catch (error) {}

        cameraVideo.setAttribute("src", newSource);

        try {
          cameraVideo.load();
        } catch (error) {}
      }

      if (newSource) {
        cameraVideo.classList.remove("hidden");

        if (videoPlaceholder) {
          videoPlaceholder.classList.add("hidden");
        }

        startCurrentVideo();
      } else {
        cameraVideo.classList.add("hidden");

        if (videoPlaceholder) {
          videoPlaceholder.classList.remove("hidden");
        }

        if (statusText) {
          statusText.textContent = "НЕТ СИГНАЛА";
        }
      }
    }

    if (cameraList) {
      const buttons =
        cameraList.querySelectorAll(".camera-list-item");

      buttons.forEach((button, index) => {
        button.classList.toggle(
          "active",
          index === currentCamera
        );
      });
    }

    console.log(
      `Круг: ${currentRound}; камера: ${currentCamera + 1}; ` +
      `альтернативное видео камеры 02: ${camera2AltActive}`
    );
  }

  function changeCamera(requestedIndex) {
    const previousCamera = currentCamera;
    const newIndex =
      ((requestedIndex % totalCameras) + totalCameras) %
      totalCameras;

    // Полный круг считается только при переходе 08 → 01.
    if (previousCamera === 7 && newIndex === 0) {
      currentRound++;
    }

    // Альтернативное видео камеры 01.
    if (
      previousCamera === 7 &&
      newIndex === 0 &&
      !altCompleted &&
      !altActive
    ) {
      altActive = true;

      console.log(
        "ALT: альтернативное видео камеры 01 включено"
      );
    }

    // После ухода с камеры 01 возвращаем обычное видео.
    if (
      previousCamera === 0 &&
      newIndex !== 0 &&
      altActive
    ) {
      altActive = false;
      altCompleted = true;

      try {
        localStorage.setItem(
          STORAGE_KEY_ALT_COMPLETED,
          "1"
        );
      } catch (error) {}

      console.log(
        "ALT: обычное видео камеры 01 восстановлено"
      );
    }

    // Альтернативное видео камеры 02 включается:
    // круг 4 + переход на камеру 02.
    if (currentRound === 4 && newIndex === 1) {
      camera2AltActive = true;

      console.log(
        "ALT: альтернативное видео камеры 02 включено"
      );
    }

    // При переходе с камеры 02 на любую другую
    // альтернативное видео сразу исчезает.
    if (previousCamera === 1 && newIndex !== 1) {
      camera2AltActive = false;

      console.log(
        "ALT: альтернативное видео камеры 02 отключено"
      );
    }

    currentCamera = newIndex;

    // При переходе 08 → 01 показываем сообщение напарника.
    if (previousCamera === 7 && newIndex === 0) {
      if (rangerMessageButton) {
        rangerMessageButton.classList.remove("hidden");
        rangerMessageButton.style.display = "";
      }
    }

    showCamera();
  }

  function goToNextCamera() {
    changeCamera(currentCamera + 1);
  }

  function goToPreviousCamera() {
    changeCamera(currentCamera - 1);
  }

  if (nextButton) {
    nextButton.addEventListener(
      "click",
      goToNextCamera
    );
  }

  if (previousButton) {
    previousButton.addEventListener(
      "click",
      goToPreviousCamera
    );
  }

  if (cameraVideo) {
    cameraVideo.loop = true;
    cameraVideo.muted = true;
    cameraVideo.playsInline = true;

    cameraVideo.addEventListener("ended", () => {
      cameraVideo.currentTime = 0;
      cameraVideo.play().catch(() => {});
    });

    cameraVideo.addEventListener("click", () => {
      try {
        if (cameraVideo.paused) {
          cameraVideo.play().catch(() => {});
        } else {
          cameraVideo.pause();
        }
      } catch (error) {}
    });
  }

  if (videoPlaceholder) {
    videoPlaceholder.addEventListener("click", () => {
      if (
        cameraVideo &&
        cameraVideo.getAttribute("src")
      ) {
        cameraVideo.classList.remove("hidden");
        videoPlaceholder.classList.add("hidden");
        startCurrentVideo();
      }
    });
  }

  function hideRangerMessageButton() {
    if (!rangerMessageButton) return;

    rangerMessageButton.classList.add("hidden");
    rangerMessageButton.style.display = "none";
  }

  if (rangerMessageButton) {
    rangerMessageButton.addEventListener("click", () => {
      if (rangerMessageWindow) {
        rangerMessageWindow.classList.remove("hidden");
      }
    });
  }

  if (closeRangerMessageButton) {
    closeRangerMessageButton.addEventListener("click", () => {
      if (rangerMessageWindow) {
        rangerMessageWindow.classList.add("hidden");
      }

      hideRangerMessageButton();
    });
  }

  if (recordButton) {
    recordButton.addEventListener("click", () => {
      if (!anomalyModal) return;

      if (anomalyCountInput) {
        anomalyCountInput.value = records.length + 1;
      }

      if (anomalyTimeInput) {
        anomalyTimeInput.value =
          cameraTime ? cameraTime.textContent : "";
      }

      if (anomalyDescInput) {
        anomalyDescInput.value = "";
      }

      anomalyModal.classList.remove("hidden");

      if (anomalyDescInput) {
        anomalyDescInput.focus();
      }
    });
  }

  if (anomalyCancel) {
    anomalyCancel.addEventListener("click", () => {
      if (anomalyModal) {
        anomalyModal.classList.add("hidden");
      }
    });
  }

  if (anomalyForm) {
    anomalyForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const count =
        parseInt(anomalyCountInput?.value, 10) ||
        records.length + 1;

      const time =
        (anomalyTimeInput?.value || "").trim();

      const description =
        (anomalyDescInput?.value || "").trim();

      if (!time || !description) {
        alert(
          "Пожалуйста, укажите время и краткое описание аномалии."
        );
        return;
      }

      records.unshift({
        count,
        time,
        camera: cameras[currentCamera]?.name || "",
        description
      });

      renderLog();

      if (statusText) {
        statusText.textContent = "ОТЧЁТ ОТПРАВЛЕН";
      }

      if (anomalyModal) {
        anomalyModal.classList.add("hidden");
      }

      setTimeout(() => {
        showToast("ОТЧЁТ ОТПРАВЛЕН", 3000);
      }, 50);
    });
  }

  if (clearLogButton) {
    clearLogButton.addEventListener("click", () => {
      if (!confirm("Очистить журнал аномалий?")) return;

      records = [];
      renderLog();

      if (statusText) {
        statusText.textContent = "Журнал очищен";
      }
    });
  }

  // Фоновая музыка запускается после первого клика.
  document.addEventListener(
    "click",
    function startAudioOnFirstClick() {
      if (backgroundMusic) {
        backgroundMusic.volume = 0.3;
        backgroundMusic.play().catch((error) => {
          console.warn(
            "Фоновая музыка не запустилась:",
            error
          );
        });
      }
    },
    { once: true }
  );

  // Звук нажатия кнопок.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button || !buttonClickSound) return;

    buttonClickSound.currentTime = 0;
    buttonClickSound.volume = 1;

    buttonClickSound.play().catch((error) => {
      console.warn(
        "Звук кнопки не запустился:",
        error
      );
    });
  });

  function initUI() {
    renderCameraList();
    showCamera();
    renderLog();
  }

  initUI();
});
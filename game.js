// game.js — восстановленная рабочая версия

// --- Список камер (если у тебя он уже есть в другом месте, можешь удалить дубли) ---
const cameras = [
  { name: "КАМЕРА 01", location: "ГЛАВНЫЕ ВОРОТА", video: "assets/videos/camera-01.mp4" },
  { name: "КАМЕРА 02", location: "ЛЕСНАЯ ТРОПА", video: "assets/videos/camera-02.mp4" },
  { name: "КАМЕРА 03", location: "СТАРЫЙ МОСТ", video: "assets/videos/camera-03.mp4" },
  { name: "КАМЕРА 04", location: "СТОРОЖЕВАЯ ВЫШКА", video: "assets/videos/camera-04.mp4" },
  { name: "КАМЕРА 05", location: "СЕВЕРНЫЙ ЛЕС", video: "assets/videos/camera-05.mp4" },
  { name: "КАМЕРА 06", location: "ЗАБРОШЕННЫЙ ДОМ", video: "assets/videos/camera-06.mp4" },
  { name: "КАМЕРА 07", location: "ОЗЕРО", video: "assets/videos/camera-07.mp4" },
  { name: "КАМЕРА 08", location: "ЗАПАДНАЯ ГРАНИЦА", video: "assets/videos/camera-08.mp4" },
];

// --- Переменные состояния ---
let currentCamera = 0;
let records = [];
// --- ALT video control for CAMERA 01 ---
const STORAGE_KEY_ALT_COMPLETED = 'ranger_cam1_alt_completed';

// Путь к новому видео для камеры 01.
// Положи файл по этому пути или измени путь здесь.
const CAMERA1_ALT_VIDEO = 'assets/videos/camera-01-alt.mp4';

let altActive = false;      // true, пока на камере 01 показывается новое видео
let altCompleted = false;   // true, когда новое видео уже было показано один раз

try {
  const v = localStorage.getItem(STORAGE_KEY_ALT_COMPLETED);
  altCompleted = (v === '1');
} catch (e) {
  // Если localStorage недоступен — просто продолжаем без сохранения.
}
// --- Вся логика и привязки после загрузки DOM ---
document.addEventListener("DOMContentLoaded", () => {
  // DOM элементы (безопасно — проверяем наличие)
  const cameraVideo = document.getElementById("cameraVideo");
  const videoPlaceholder = document.getElementById("videoPlaceholder");
// Зацикливание всех видео камер, включая альтернативное видео камеры 01.
if (cameraVideo) {
  cameraVideo.loop = true;
  cameraVideo.muted = true;
  cameraVideo.playsInline = true;

  // Запасной вариант: если браузер всё же отправил событие окончания,
  // возвращаем видео в начало и запускаем снова.
  cameraVideo.addEventListener("ended", () => {
    cameraVideo.currentTime = 0;
    cameraVideo.play().catch(() => {});
  });
}
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

  // Модал отчёта
  const anomalyModal = document.getElementById("anomalyModal");
  const anomalyForm = document.getElementById("anomalyForm");
  const anomalyCountInput = document.getElementById("anomalyCount");
  const anomalyTimeInput = document.getElementById("anomalyTime");
  const anomalyDescInput = document.getElementById("anomalyDescription");
  const anomalyCancel = document.getElementById("anomalyCancel");

  // Сообщение от напарника
  const rangerMessageButton = document.getElementById("rangerMessageButton");
  const rangerMessageWindow = document.getElementById("rangerMessageWindow");
  const closeRangerMessageButton = document.getElementById("closeRangerMessageButton");

  // Тост
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(message = "ОТЧЁТ ОТПРАВЛЕН", ms = 3000) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
      toastTimer = null;
    }, ms);
  }

  // --- Вспомогательные функции ---
  function escapeHtml(value) {
    const s = value == null ? "" : String(value);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Обновление часов камеры
  function updateClock() {
    if (!cameraTime) return;
    const now = new Date();
    cameraTime.textContent = now.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- Рендер списка камер ---
  function renderCameraList() {
    if (!cameraList) return;
    cameraList.innerHTML = "";
    cameras.forEach((camera, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "camera-list-item";
      if (index === currentCamera) btn.classList.add("active");
      btn.textContent = `${camera.name} — ${camera.location}`;
      btn.addEventListener("click", () => {
  changeCamera(index);
});
      cameraList.appendChild(btn);
    });
  }

  // Рендер журнала
  function renderLog() {
    if (!logList) return;
    logList.innerHTML = "";
    if (!records.length) {
      logList.innerHTML = '<p class="empty-log">Аномалий пока не обнаружено.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    records.forEach((rec) => {
      const item = document.createElement("div");
      item.className = "log-entry";
      item.innerHTML = `
        <div class="log-meta">
          <strong>#${escapeHtml(rec.count)}</strong>
          <span style="color:#f7e98b; margin-left:8px;">${escapeHtml(rec.time)}</span>
          — <em style="color:#bde6c6; margin-left:8px;">${escapeHtml(rec.camera)}</em>
        </div>
        <div class="log-desc">${escapeHtml(rec.description)}</div>
      `;
      frag.appendChild(item);
    });
    logList.appendChild(frag);
  }

  // --- Видео: запуск и управление ---
  async function startCurrentVideo() {
    if (!cameraVideo) return;
    try {
      await cameraVideo.play();
      if (statusText) statusText.textContent = "СИГНАЛ ПОДКЛЮЧЁН";
    } catch (err) {
      console.warn("Автозапуск видео не удался:", err);
      if (statusText) statusText.textContent = "НАЖМИТЕ НА ЭКРАН ДЛЯ ЗАПУСКА";
    }
  }

  // Показ выбранной камеры
  function showCamera() {
    const cam = cameras[currentCamera];
    if (!cam) return;

    if (cameraName) cameraName.textContent = cam.name || "";
    if (cameraLocation) cameraLocation.textContent = cam.location || "";

    if (cameraVideo) {
      const newSrc = cam.video || "";
      // Если источник изменился — подставим и загрузим
      if (cameraVideo.getAttribute("src") !== newSrc) {
        try {
          cameraVideo.pause();
        } catch (e) {}
        cameraVideo.setAttribute("src", newSrc);
        try {
          cameraVideo.load();
        } catch (e) {}
      }
      if (newSrc) {
        cameraVideo.classList.remove("hidden");
        if (videoPlaceholder) videoPlaceholder.classList.add("hidden");
        startCurrentVideo();
      } else {
        cameraVideo.classList.add("hidden");
        if (videoPlaceholder) videoPlaceholder.classList.remove("hidden");
        if (statusText) statusText.textContent = "НЕТ СИГНАЛА";
      }
    }

    // обновляем активность в списке
    if (cameraList) {
      const buttons = cameraList.querySelectorAll(".camera-list-item");
      buttons.forEach((btn, idx) => {
        if (idx === currentCamera) btn.classList.add("active");
        else btn.classList.remove("active");
      });
    }
  }
function changeCamera(requestedIndex) {
  const prev = currentCamera;
  const len = cameras.length;

  // Нормализация индекса: например, после 8 камеры вернёмся на 1.
  const newIndex = ((requestedIndex % len) + len) % len;

  // Переход с камеры 08 на камеру 01.
  if (prev === len - 1 && newIndex === 0) {
    // Включаем альтернативное видео только один раз.
    if (!altCompleted && !altActive) {
      try {
        // Запоминаем оригинальный файл камеры 01.
        cameras[0]._originalVideo = cameras[0].video;

        // Временно устанавливаем новое видео.
        cameras[0].video = CAMERA1_ALT_VIDEO;

        altActive = true;
        console.log('ALT: альтернативное видео камеры 01 включено');
      } catch (e) {
        console.warn('ALT: не удалось включить альтернативное видео', e);
      }
    }

    // Существующая логика: показываем кнопку сообщения от напарника.
    if (typeof rangerMessageButton !== 'undefined' && rangerMessageButton) {
      rangerMessageButton.classList.remove('hidden');
      rangerMessageButton.style.display = '';
    }
  }

  // Если игрок уходит с камеры 01, пока показывается альтернативное видео:
  // возвращаем оригинальное видео и блокируем повторный показ alt-видео.
  if (prev === 0 && newIndex !== 0 && altActive) {
    try {
      if (cameras[0]._originalVideo) {
        cameras[0].video = cameras[0]._originalVideo;
      }

      delete cameras[0]._originalVideo;
    } catch (e) {
      console.warn('ALT: не удалось восстановить обычное видео', e);
    }

    altActive = false;
    altCompleted = true;

    try {
      localStorage.setItem(STORAGE_KEY_ALT_COMPLETED, '1');
    } catch (e) {}

    console.log('ALT: обычное видео камеры 01 восстановлено; alt-видео больше недоступно');
  }

  // Применяем новую камеру и обновляем экран.
  currentCamera = newIndex;
  showCamera();
}
  // --- Кнопки перехода ---
  function goToNextCamera() {
  changeCamera(currentCamera + 1);
}
 function goToPreviousCamera() {
  changeCamera(currentCamera - 1);
}
  if (nextButton) nextButton.addEventListener("click", goToNextCamera);
  if (previousButton) previousButton.addEventListener("click", goToPreviousCamera);

  // клик по placeholder запускает видео
  if (videoPlaceholder) {
    videoPlaceholder.addEventListener("click", () => {
      if (cameraVideo && cameraVideo.getAttribute("src")) {
        cameraVideo.classList.remove("hidden");
        videoPlaceholder.classList.add("hidden");
        startCurrentVideo();
      }
    });
  }

  // клик по видео — play / pause
  if (cameraVideo) {
    cameraVideo.addEventListener("click", () => {
      try {
        if (cameraVideo.paused) cameraVideo.play().catch(() => {});
        else cameraVideo.pause();
      } catch (e) {}
    });
  }

  // --- Управление сообщением от напарника ---
  function hideRangerMessageButton() {
    if (!rangerMessageButton) return;
    rangerMessageButton.classList.add("hidden");
    rangerMessageButton.style.display = "none";
  }
  function showRangerMessageButton() {
    if (!rangerMessageButton) return;
    rangerMessageButton.classList.remove("hidden");
    rangerMessageButton.style.display = "";
  }

  if (rangerMessageButton) {
    rangerMessageButton.addEventListener("click", () => {
      if (rangerMessageWindow) rangerMessageWindow.classList.remove("hidden");
    });
  }
  if (closeRangerMessageButton) {
    closeRangerMessageButton.addEventListener("click", () => {
      if (rangerMessageWindow) rangerMessageWindow.classList.add("hidden");
      hideRangerMessageButton();
    });
  }

  // --- Модал отчёта об аномалии ---
  if (recordButton) {
    recordButton.addEventListener("click", () => {
      if (!anomalyModal) return;
      anomalyCountInput.value = records.length + 1;
      anomalyTimeInput.value = cameraTime ? cameraTime.textContent : "";
      anomalyDescInput.value = "";
      anomalyModal.classList.remove("hidden");
      if (anomalyDescInput) anomalyDescInput.focus();
    });
  }

  if (anomalyCancel) {
    anomalyCancel.addEventListener("click", () => {
      if (anomalyModal) anomalyModal.classList.add("hidden");
    });
  }

  if (anomalyForm) {
    anomalyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const count = parseInt(anomalyCountInput.value, 10) || (records.length + 1);
      const time = (anomalyTimeInput.value || "").trim();
      const desc = (anomalyDescInput.value || "").trim();
      if (!time || !desc) {
        alert("Пожалуйста, укажите время и краткое описание аномалии.");
        return;
      }
      records.unshift({
        count: count,
        time: time,
        camera: cameras[currentCamera] ? cameras[currentCamera].name : "",
        description: desc,
      });
      renderLog();
      if (statusText) statusText.textContent = "ОТЧЁТ ОТПРАВЛЕН";
      if (anomalyModal) anomalyModal.classList.add("hidden");
      // тост для подтверждения
      setTimeout(() => showToast("ОТЧЁТ ОТПРАВЛЕН", 3000), 50);
    });
  }

  // --- Очистка журнала ---
  if (clearLogButton) {
    clearLogButton.addEventListener("click", () => {
      if (!confirm("Очистить журнал аномалий?")) return;
      records = [];
      renderLog();
      if (statusText) statusText.textContent = "Журнал очищен";
    });
  }

  // --- Инициализация интерфейса ---
  function initUI() {
    renderCameraList();
    showCamera();
    renderLog();
    // По умолчанию — показываем кнопку напарника (или оставим видимым в HTML)
    // если хочешь, чтобы кнопка была скрыта при старте — вызови hideRangerMessageButton();
  }

  initUI();
}); // end DOMContentLoaded
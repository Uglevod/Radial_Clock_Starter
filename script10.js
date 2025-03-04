const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Создаем и настраиваем аудио элемент
const backgroundMusic = new Audio('sounds/0.mp3');
backgroundMusic.loop = false; // Отключаем зацикливание
backgroundMusic.volume = 0.5; // Устанавливаем громкость на 50%

// Создаем аудио элемент для сигнала начала часа
const hourlyChime = new Audio('sounds/1.mp3');
hourlyChime.loop = false;
hourlyChime.volume = 0.5;

// Создаем аудио элемент для сигнала достижения часовой дуги
const arcMatchChime = new Audio('sounds/2.mp3');
arcMatchChime.loop = false;
arcMatchChime.volume = 0.5;

// Функция для начала воспроизведения
function playBackgroundMusic() {
  // Проверяем, не проигрывается ли уже звук
  if (backgroundMusic.paused) {
    backgroundMusic.play().catch(error => {
      console.warn('Автоматическое воспроизведение заблокировано браузером:', error);
    });
  }
}

// Запускаем воспроизведение при загрузке страницы
document.addEventListener('DOMContentLoaded', playBackgroundMusic);

// Координаты центра дуги  
//let centerX = canvas.width / 2;
//let centerY = canvas.height / 2-135;
let centerX = canvas.width / 2;
let centerY = 150;

// Радиус внешней дуги (минуты)  
let outerRadius = Math.min(canvas.width, canvas.height) / 4;  

// Радиус внутренней дуги (часы)
let innerRadius = outerRadius * 0.8;

// Параметр стартового часа (от 0 до 23)
let startHour = 6; // Например, начинаем с 3 часов

// Параметр длительности дня (например, 12 или 24 часа)
let dayDuration = 15; // По умолчанию 12 часов

// Добавляем после существующих глобальных переменных
let animationStartTime = Date.now();
let isInitialAnimation = true;
const animationDuration = 800; // уменьшим длительность для каждого элемента
const animationDelay = 100; // уменьшим задержку между элементами

// Добавляем после существующих глобальных переменных
let arcAnimationStartTime = Date.now();
let isArcAnimationActive = true;
const arcAnimationDuration = 1500; // длительность анимации дуг

// Добавим новые переменные для управления последовательностью анимаций
let animationPhase = 'list'; // 'list', 'arcs', 'complete'

// Добавляем переменную для отслеживания последнего времени отрисовки
let lastDrawTime = 0;
const frameInterval = 1000 / 60; // Целевые 60 FPS

// Добавляем в начало файла после объявления canvas
const roleImages = {}; // Кэш для изображений ролей
let currentRoleImage = null; // Текущее отображаемое изображение
let roleImageOpacity = 0; // Прозрачность изображения для анимации
const roleImageFadeSpeed = 0.05; // Скорость появления изображения

// Данные о планах
let plan = [
  { name: "utro", title: "Утро", color: "#FF6B6B", prc: 10, cat: "utro", role: "probuda" },     // Яркий коралловый
  { name: "work", title: "Ворк", color: "#4ECDC4", prc: 30, cat: "work", role: "dostigator" },  // Бирюзовый
  { name: "dance", title: "Дансы", color: "#20A00F", prc: 20, cat: "dance", role: "dancer" },       
  { name: "len", title: "Лень" , color: "#9B59B6", prc: 20, cat: "len", role: "lenivec" },      // Насыщенный фиолетовый
  { name: "free", title: "Свое", color: "#2ECC71", prc: 40, cat: "free", role: "cheld" },       // Изумрудный зеленый
  { name: "predson", title: "Предсон", color: "#F1C40F", prc: 10, cat: "predson", role: "sonmen" }, // Золотой
  //{ name: "predson", title: "Сон", color: "#01a4a0", prc: 80, cat: "predson", role: "sonmen" } // Золотой
   
];

// Данные о задачах
let doos = [
  { do: "Пить воду", cat: "utro", done: false },
  { do: "Делать проект", cat: "work", done: false },
  { do: "Ленится", cat: "len", done: false },
  { do: "Занимать чем угодно", cat: "free", done: false },
  { do: "Пить воду", cat: "predson", done: false },
  { do: "Дэнсить", cat: "dance", done: false },
  { do: "Чистить зубу", cat: "predson", done: false }
];

// Данные о ролях
let roles = [
  { role: "probuda", name:"Пробуждатор", disc: "Радоватаься", prehist: "История такова", goal: "Выполнять задачи утренего ритуала" },
  { role: "dostigator", name:"Достигатор", disc: "Достигатель результатов", prehist: "История такова", goal: "Выполнять задачи рабочие" },
  { role: "dancer", name:"Дансер", disc: "Дансы", prehist: "История такова", goal: "Отдансится танцев" },
  { role: "lenivec", name:"Ленивец", disc: "Мастер в лени", prehist: "История такова", goal: "Выполнять задачи лени" },
  { role: "cheld", name:"Человек", disc: "Делать приятное", prehist: "История такова", goal: "Творческое проявление" },
  { role: "sonmen", name:"Сонник", disc: "Мастер подготовки ко сну", prehist: "История такова", goal: "Выполнять задачи вечерней подготовки ко сну" }
];

// Предзагрузка изображений ролей
function preloadRoleImages() {
  roles.forEach(role => {
    const img = new Image();
    img.src = `img/${role.role}.jpg`;
    roleImages[role.role] = img;
  });
}

// Вызываем предзагрузку после определения ролей
preloadRoleImages();

// Добавим функцию для конвертации минут в строку времени
function minutesToTimeString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function drawArc(timestamp) {
  // Ограничиваем частоту отрисовки для стабильной анимации
  if (timestamp - lastDrawTime < frameInterval) {
    requestAnimationFrame(drawArc);
    return;
  }
  lastDrawTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Получение текущего времени и расчет углов
  const now = new Date();
  const minutes = now.getMinutes();
  const hours = now.getHours();
  const currentTimeInMinutes = hours * 60 + minutes;

  // Проигрываем звук в начале каждого часа
  if (minutes === 0) {
    // Проверяем, не проигрывается ли уже звук
    if (hourlyChime.paused) {
      hourlyChime.play().catch(error => {
        console.warn('Воспроизведение звука начала часа заблокировано:', error);
      });
    }
  }

  // Расчет базовых углов
  let outerAngle = (minutes / 60) * 360;  
  let hourAngle = ((hours - startHour + 24) % 24);
  let hourFraction = minutes / 60;
  let totalHourProgress = hourAngle + hourFraction;
  let innerAngle = (totalHourProgress / dayDuration) * 360;

  // Модифицируем расчет прогресса анимации для более плавного движения
  const arcAnimationProgress = isArcAnimationActive && animationPhase === 'arcs'
    ? Math.min(1, (timestamp - arcAnimationStartTime) / arcAnimationDuration)
    : animationPhase === 'complete' ? 1 : 0;

  // Используем функцию сглаживания для более плавной анимации
  const smoothProgress = easeInOutCubic(arcAnimationProgress);

  // Применяем сглаженный прогресс анимации к углам
  outerAngle *= smoothProgress;
  innerAngle *= smoothProgress;

  // Рисование внешней дуги (минуты)
  ctx.beginPath();  
  ctx.arc(centerX, centerY, outerRadius, 0, outerAngle * Math.PI / 180);
  ctx.lineWidth = 5; 
  ctx.strokeStyle = 'lightgray';
  ctx.lineCap = 'round'; 
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Добавляем промежуточную дугу для временных промежутков
  const middleRadius = (outerRadius + innerRadius) / 2;

  // Рассчитываем общую длительность дня в минутах и нормализуем план
  const totalDayMinutes = dayDuration * 60;
  const totalPrc = plan.reduce((sum, period) => sum + period.prc, 0);
  const normalizedPlan = plan.map(period => ({
    ...period,
    normalizedPrc: (period.prc / totalPrc) * 100
  }));

  // Рисование промежуточной дуги с периодами
  let periodStartAngle = 0;
  normalizedPlan.forEach(period => {
    const periodAngle = (period.normalizedPrc / 100) * 360 * smoothProgress;
    
    // Проверяем, является ли период активным
    const periodStartTime = startHour * 60 + (periodStartAngle / 360) * totalDayMinutes;
    const periodEndTime = periodStartTime + (periodAngle / 360) * totalDayMinutes;
    const isActive = currentTimeInMinutes >= periodStartTime && 
                    currentTimeInMinutes < periodEndTime;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, middleRadius, 
      (periodStartAngle * Math.PI) / 180, 
      ((periodStartAngle + periodAngle) * Math.PI) / 180
    );
    // Устанавливаем толщину линии в зависимости от активности периода
    ctx.lineWidth = isActive ? 8 : 4; // Увеличиваем толщину для активного периода
    ctx.strokeStyle = period.color;
    ctx.lineCap = 'butt';
    ctx.stroke();

    periodStartAngle += periodAngle;
  });

  // Рассчитываем время начала для каждого периода
  let currentTimeFromStart = startHour * 60;
  let activePeriod = null;

  normalizedPlan.forEach((period, index) => {
    // Сохраняем время начала периода
    const periodStartTime = currentTimeFromStart;
    const periodDuration = (period.normalizedPrc / 100) * totalDayMinutes;
    const periodEndTime = periodStartTime + periodDuration;

    // Проверяем, является ли период активным
    const isActive = currentTimeInMinutes >= periodStartTime && 
                    currentTimeInMinutes < periodEndTime;

    if (isActive) {
      activePeriod = period;
      // Добавляем подсветку активного сегмента на дуге
      ctx.beginPath();
      
      // Правильный расчет углов на основе времени
      const dayMinutes = dayDuration * 60;
      const startAngle = ((periodStartTime / dayMinutes) * 360) * Math.PI / 90;
      const endAngle = ((periodEndTime / dayMinutes) * 360) * Math.PI / 90;
      
      // Рисование дуги с подсветкой
      ctx.arc(centerX, centerY, middleRadius, startAngle, endAngle);
      ctx.lineWidth = 1; // Делаем линию чуть толще для выделения
      ctx.strokeStyle = period.color;
      ctx.lineCap = 'butt';
      ctx.stroke();

      // Проверка корректности углов
      if (startAngle > endAngle) {
        console.warn('Ошибка в расчете углов:', {
          periodStartTime,
          periodEndTime,
          startAngle: startAngle * 180 / Math.PI,
          endAngle: endAngle * 180 / Math.PI
        });
      }
    }

    // Анимация элемента списка
    const elementDelay = index * animationDelay;
    const elementProgress = isInitialAnimation 
      ? Math.min(1, Math.max(0, (timestamp - (animationStartTime + elementDelay)) / animationDuration))
      : 1;

    const smoothElementProgress = easeOutBack(elementProgress);

    // Если элемент должен быть видимым
    if (smoothElementProgress > 0) {
      // Отрисовка элемента списка
      const planBarY = 340 + index * (20 + 10);
      ctx.save();
      
      // Настройка трансформации
      const barCenterY = planBarY + 10;
      ctx.translate(canvas.width / 2, barCenterY);
      ctx.rotate((1 - smoothElementProgress) * Math.PI);
      ctx.scale(smoothElementProgress, smoothElementProgress);
      ctx.translate(-canvas.width / 2, -barCenterY);

      // Установка прозрачности
      ctx.globalAlpha = smoothElementProgress * 0.5;

      // Отрисовка фона периода
      ctx.beginPath();
      ctx.rect(50, planBarY, canvas.width - 100, 20);
      ctx.fillStyle = period.color;
      ctx.fill();

      // Если период активный, добавляем выделение
      if (isActive) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.strokeRect(50, planBarY, canvas.width - 100, 20);
      }

      // Отрисовка информации о периоде
      ctx.globalAlpha = smoothElementProgress;
      ctx.font = '12px Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'left';
      
      // Отображаем время начала периода и название
      const timeStr = `${minutesToTimeString(periodStartTime)} -  ${period.title}`;
      ctx.fillText(timeStr, 10, planBarY + 15);

      // Отображаем длительность периода
      ctx.textAlign = 'right';
      const durationHours = Math.floor(periodDuration / 60);
      const durationMinutes = Math.floor(periodDuration % 60);
      const durationStr = `${durationHours}ч ${durationMinutes}м`;
      ctx.fillText(durationStr, canvas.width - 60, planBarY + 15);

      ctx.restore();
    }

    // Обновляем время начала для следующего периода
    currentTimeFromStart = periodEndTime;
  });

  // Рисование синего отрезка минутной дуги
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius+5, 0, innerAngle * Math.PI / 180);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'skyblue';
  ctx.lineCap = 'round'; 
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Рисование внутренней дуги (часы)
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, innerAngle * Math.PI / 180);  
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'green';
  ctx.lineCap = 'round'; 
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Рисование линии прогресса внизу
  const progressLineY = canvas.height - 20; // Позиция линии по вертикали
  const progressLineHeight = 10; // Толщина линии прогресса
  const progressLineWidth = canvas.width * 0.8; // Ширина линии прогресса (80% от ширины canvas)
  const progressLineX = (canvas.width - progressLineWidth) / 2; // Центрирование линии

  // Исправляем расчет процента прошедшего времени
  const progressPercent = (totalHourProgress / dayDuration) * 100;

  // Рисование фоновой линии (серая)
  ctx.beginPath();
  ctx.rect(progressLineX, progressLineY, progressLineWidth, progressLineHeight);
  ctx.fillStyle = '#ddd';
  //ctx.fill();

  // Рисование прогресса (синяя линия)
  ctx.beginPath();
  ctx.rect(progressLineX, progressLineY, (progressPercent / 100) * progressLineWidth, progressLineHeight);
  ctx.fillStyle = 'blue';
  //ctx.fill();

  // Отображение текста с процентом
  ctx.font = '16px Arial';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  //ctx.fillText(`${progressPercent.toFixed(1)}%`, canvas.width / 2, progressLineY - 10);

  // Добавляем отображение изображения роли для активного периода
  if (activePeriod) {
    // Проверяем, изменилась ли роль
    if (!currentRoleImage || currentRoleImage.role !== activePeriod.role) {
      roleImageOpacity = 0; // Сбрасываем прозрачность при смене роли
      currentRoleImage = {
        role: activePeriod.role,
        image: roleImages[activePeriod.role]
      };
    }

    // Увеличиваем прозрачность
    roleImageOpacity = Math.min(1, roleImageOpacity + roleImageFadeSpeed);

    // Если изображение загружено, отрисовываем его
    if (currentRoleImage.image.complete) {
      const imgSize = 220;
      const imgX = centerX - imgSize / 2;
      const imgY = centerY - imgSize / 2;
      
      // Создаем круглую маску для изображения
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, imgSize / 2, 0, Math.PI * 2);
      ctx.clip();
      
      // Устанавливаем прозрачность
      ctx.globalAlpha = roleImageOpacity;
      
      // Отрисовываем изображение
      ctx.drawImage(currentRoleImage.image, imgX, imgY, imgSize, imgSize);
      
      // Восстанавливаем контекст
      ctx.restore();
      
      // Добавляем обводку вокруг изображения с той же прозрачностью
      ctx.beginPath();
      ctx.arc(centerX, centerY, imgSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = activePeriod.color;
      ctx.globalAlpha = roleImageOpacity;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Восстанавливаем прозрачность
      ctx.globalAlpha = 1;
    }

    // Находим и отображаем информацию о роли
    const activeRole = roles.find(r => r.role === activePeriod.role);
    
    if (activeRole) {
      // Настраиваем параметры отображения
      //const roleInfoX = canvas.width - 230; // Отступ справа
      const roleInfoX = 50;  
      //const roleInfoY = canvas.height - 320; // Отступ снизу
      const roleInfoY = 280;

      const lineHeight = 20; // Высота строки
      
      // Отображаем заголовок информации о роли
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = activePeriod.color;
      ctx.textAlign = 'left';
      ctx.fillText(`Роль: ${activeRole.name}`, roleInfoX, roleInfoY);
      
      // Отображаем описание роли
      ctx.font = '14px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText(`Описание: ${activeRole.disc}`, roleInfoX, roleInfoY + lineHeight);
      
      // Отображаем цель роли
      // Разбиваем длинный текст на несколько строк
      const maxWidth = 240;
      let words = activeRole.goal.split(' ');
      let line = '';
      let goalY = roleInfoY + lineHeight * 2;
      
      ctx.fillText(`Цель: ${activeRole.goal}`, roleInfoX, goalY);
      goalY += lineHeight;
      
      words.forEach(word => {
        let testLine = line + word + ' ';
        let metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth) {
          ctx.fillText(line, roleInfoX, goalY);
          line = word + ' ';
          goalY += lineHeight;
        } else {
          line = testLine;
        }
      });
      //ctx.fillText(line, roleInfoX, goalY);
    }
  }

  // Изменяем отображение списка дел для активного промежутка (внизу)
  if (activePeriod) {
    const tasks = doos.filter(task => task.cat === activePeriod.cat);
    
    // Вычисляем позиции для списка задач внизу
    //const taskListY = canvas.height - 320; // Отступ от низа холста
    const taskListY = 170;  
    const taskListX = 600; // Отступ слева
    const taskSpacing = 20; // Расстояние между задачами
    
    // Отображение заголовка списка задач
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = activePeriod.color; // Используем цвет активного периода
    ctx.textAlign = 'left';
    ctx.fillText(`Задачи для ${activePeriod.title}:`, taskListX, taskListY);

    // Отображение каждой задачи
    ctx.font = '14px Arial';
    ctx.fillStyle = 'black';
    tasks.forEach((task, index) => {
      const taskY = taskListY + taskSpacing + (index * taskSpacing);
      ctx.fillText(`- ${task.do}`, taskListX + 10, taskY);
    });
  }

  // Отрисовка списка периодов только если мы в фазе анимации списка или позже
  if (animationPhase !== 'none') {
    // ... код отрисовки списка периодов ...
  }

  // Проверяем и обновляем фазы анимации
  if (animationPhase === 'list') {
    const lastElementAnimationEnd = animationStartTime + 
      (normalizedPlan.length - 1) * animationDelay + animationDuration;
    
    if (timestamp >= lastElementAnimationEnd) {
      animationPhase = 'arcs';
      arcAnimationStartTime = timestamp;
    }
    requestAnimationFrame(drawArc);
  } else if (animationPhase === 'arcs') {
    if (arcAnimationProgress >= 1) {
      animationPhase = 'complete';
      isArcAnimationActive = false;
    }
    requestAnimationFrame(drawArc);
  } else if (animationPhase === 'complete') {
    // Запускаем регулярное обновление
    setTimeout(() => {
      setInterval(() => requestAnimationFrame(drawArc), 60000);
    }, 0);
  }
}

// Добавляем функции сглаживания для более плавной анимации
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Модифицируем функцию startAnimation
function startAnimation() {
  animationPhase = 'list';
  animationStartTime = performance.now();
  isInitialAnimation = true;
  requestAnimationFrame(drawArc);
}

// Запускаем анимацию при загрузке страницы
document.addEventListener('DOMContentLoaded', startAnimation);

// Обработчик изменения размера окна
window.addEventListener('resize', function() {
  // Обновляем размеры canvas
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  // Пересчитываем центр и радиусы
  centerX = canvas.width / 2;
  centerY = canvas.height / 2;
  outerRadius = Math.min(canvas.width, canvas.height) / 3;
  innerRadius = outerRadius * 0.7;
  
  // Перерисовываем только если анимация уже завершена
  if (animationPhase === 'complete') {
    requestAnimationFrame(drawArc);
  }
});

// Также добавим функцию для расчета угла для текущего времени
function getTimeAngle(minutes) {
  return (minutes / (dayDuration * 60)) * 360;
}
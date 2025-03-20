// options.js - скрипт для страницы с настройками расширения.

// Максимальное количество элементов в истории
const MAX_HISTORY_ITEMS = 50;

// Хост по умолчанию
const DEFAULT_HOST = 'https://localhost.ru.test';

// Функция для перехода по URL с использованием background.js
async function openUrlWithHost(url) {
	try {
		// Отправляем сообщение в background script
		await chrome.runtime.sendMessage({
			action: 'openLink',
			url: url
		});
	} catch (error) {
		alert('Ошибка при открытии ссылки: ' + error.message);
	}
}

// Обработчик события нажатия кнопки "Сохранить".
document.getElementById('saveButton').addEventListener('click', function() {
	// Получаем значение поля ввода хоста
	const host = document.getElementById('host').value;
	
	// Проверяем корректность URL
	try {
		new URL(host);
		// Сохраняем хост в настройках расширения
		chrome.storage.sync.set({host: host}, function() {
			alert('Настройки сохранены!');
		});
	} catch (e) {
		alert('Пожалуйста, введите корректный URL');
	}
});

// Функция для отображения истории
function displayHistory(history = []) {
	const historyList = document.getElementById('historyList');
	historyList.innerHTML = '';
	
	if (history.length === 0) {
		historyList.innerHTML = '<p>История пуста</p>';
		return;
	}
	
	history.forEach(url => {
		const item = document.createElement('div');
		item.className = 'history-item';
		
		// Создаем ссылку с иконкой
		const urlElement = document.createElement('a');
		urlElement.className = 'history-url';
		urlElement.href = '#';
		urlElement.title = 'Открыть в новой вкладке';
		urlElement.onclick = (e) => {
			e.preventDefault();
			openUrlWithHost(url);
		};
		
		// Создаем иконку
		const icon = document.createElement('img');
		icon.src = '/images/icons8-dev-16.png';
		icon.alt = 'Открыть';
		
		// Добавляем текст URL
		const urlText = document.createTextNode(url);
		
		// Собираем ссылку
		urlElement.appendChild(icon);
		urlElement.appendChild(urlText);
		
		// Добавляем элементы в item
		item.appendChild(urlElement);
		
		historyList.appendChild(item);
	});
}

// Загружаем сохраненные данные при открытии страницы
window.onload = async function() {
	// Загружаем сохраненный хост
	const {host = DEFAULT_HOST} = await chrome.storage.sync.get('host');
	document.getElementById('host').value = host;
	
	// Загружаем историю
	const {history = []} = await chrome.storage.sync.get('history');
	displayHistory(history);
};

// Слушаем изменения в storage
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (changes.history) {
		displayHistory(changes.history.newValue || []);
	}
});
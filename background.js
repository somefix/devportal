// background.js - фоновый скрипт расширения.

// Максимальное количество элементов в истории
const MAX_HISTORY_ITEMS = 50;

// Хост по умолчанию
const DEFAULT_HOST = 'https://localhost.ru.test';

// Обработчик события нажатия кнопки мыши на иконке расширения.
chrome.action.onClicked.addListener(async (tab) => {
	const url = tab.url;
	await saveUrlToHistory(url);
	await openLink(url);
});

// Добавляем пункт контекстного меню для открытия настроек
chrome.contextMenus.create({
	id: "openOptions",
	title: "Открыть настройки",
	contexts: ["all"]
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
	if (info.menuItemId === "openOptions") {
		chrome.runtime.openOptionsPage();
	}
});

// Обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'openLink') {
		openLink(request.url);
		sendResponse({success: true});
	}
	return true;
});

// Функция для сохранения URL в историю расширения.
async function saveUrlToHistory(url) {
	try {
		// Получаем текущую историю из хранилища
		const {history = []} = await chrome.storage.sync.get('history');
		
		// Удаляем дубликаты и добавляем новый URL в начало
		const uniqueHistory = [url, ...new Set(history)];
		
		// Ограничиваем количество элементов
		const limitedHistory = uniqueHistory.slice(0, MAX_HISTORY_ITEMS);
		
		// Сохраняем обновленную историю
		await chrome.storage.sync.set({history: limitedHistory});
	} catch (error) {
		console.error('Ошибка при сохранении истории:', error);
	}
}

// Функция для открытия заданного адреса в новой вкладке.
async function openLink(url) {
	try {
		// Получаем сохраненный хост
		const {host = DEFAULT_HOST} = await chrome.storage.sync.get('host');
		
		const targetUrl = new URL(url);
		const hostUrl = new URL(host);
		
		// Создаем новый URL, сохраняя путь и параметры
		const newUrl = `${hostUrl.origin}${targetUrl.pathname}${targetUrl.search}`;
		
		// Открываем в новой вкладке
		await chrome.tabs.create({url: newUrl});
	} catch (error) {
		console.error('Ошибка при открытии ссылки:', error);
		// Показываем сообщение об ошибке пользователю
		if (error.message === 'Хост не настроен') {
			chrome.runtime.openOptionsPage();
		}
	}
}

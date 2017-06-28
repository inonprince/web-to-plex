/* global config, findPlexMedia, parseOptions, showNotification, modifyPlexButton */
function isMovie() {
	const tag = document.querySelector('meta[property="og:type"]');
	return tag && tag.content === 'video.movie';
}

function isShow() {
	const tag = document.querySelector('meta[property="og:type"]');
	return tag && tag.content === 'video.tv_show';
}

function isList() {
	return window.location.pathname.startsWith('/list/');
}

function getImdbId() {
	const tag = document.querySelector('meta[property="pageId"]');
	return tag && tag.content;
}

function cleanYear(year) {
	// The year can contain `()`, so we need to strip it out.
	return parseInt(year.trim().replace(/\(|\)/g, ''));
}

const imdbId = getImdbId();

function renderPlexButton($parent) {
	if (!$parent) {
		console.log('Could not add Plex button.');
		return null;
	}
	const el = document.createElement('a');
	el.classList.add('web-to-plex-button');
	el.style.display = 'none';
	$parent.appendChild(el);
	return el;
}

function initPlexMovie() {
	const $parent = document.querySelector('.plot_summary');
	const $button = renderPlexButton($parent);
	if (!$button) {
		return;
	}
	const $title = document.querySelector('.title_wrapper h1');
	const $year = document.querySelector('.title_wrapper #titleYear');
	// TODO: Hmm there should be a less risky way...
	const title = $title.childNodes[0].textContent.trim();
	const year = cleanYear($year.textContent);

	fetch('https://api.themoviedb.org/3/find/' + imdbId + '?api_key=' + config.tmdbToken + '&language=en-US&external_source=imdb_id').then(function(resp) {
		return resp.json()
	}).then(function(json) {
		const tmdbId = (json && json.movie_results && json.movie_results.length) ? json.movie_results[0].id : null;
		findPlexMedia({ type: 'movie', title, year, button: $button, imdbId, tmdbId });
	});
}

function initPlexShow() {
	const $parent = document.querySelector('.plot_summary');
	const $button = renderPlexButton($parent);
	if (!$button) {
		return;
	}
	const $title = document.querySelector('.title_wrapper h1');
	const date = document.querySelector('title').textContent;
	const dateMatch = date.match(/Series (\d{4})/);
	if (!$title || !dateMatch) {
		modifyPlexButton($button, 'error', 'Could not extract title or year');
		return;
	}
	const title = $title.textContent.trim();
	const year = parseInt(dateMatch[1]);

	fetch('https://api.themoviedb.org/3/find/' + imdbId + '?api_key=' + config.tmdbToken + '&language=en-US&external_source=imdb_id').then(function(resp) {
		return resp.json()
	}).then(function(json) {
		const tmdbId = (json && json.movie_results && json.movie_results.length) ? json.movie_results[0].id : null;
		findPlexMedia({ type: 'show', title, year, button: $button, imdbId, tmdbId });
	});
}

function addInListItem(el) {
	const $parent = el.querySelector('.button_strip');
	const $button = renderPlexButton($parent);
	if (!$button) {
		return;
	}
	const $imdbId = el.querySelector('.wlb_lite');
	const $title = el.querySelector('.info b a');
	const $date = el.querySelector('.info .year_type');
	if (!$imdbId || !$title || !$date) {
		modifyPlexButton($button, 'error', 'Could not extract title or year');
		return;
	}
	const type = $date.textContent.includes('TV Series') ? 'show' : 'movie';
	const title = $title.textContent.trim();
	const year = cleanYear($date.textContent);
	const myImdbId = $imdbId.dataset.tconst;

	fetch('https://api.themoviedb.org/3/find/' + imdbId + '?api_key=' + config.tmdbToken + '&language=en-US&external_source=imdb_id').then(function(resp) {
		return resp.json()
	}).then(function(json) {
		const tmdbId = (json && json.movie_results && json.movie_results.length) ? json.movie_results[0].id : null;
		findPlexMedia({ type, title, year, button: $button, imdbId: myImdbId, tmdbId });
	});
}

function initList() {
	const $listItem = document.querySelectorAll('#main .list_item');

	$listItem.forEach(addInListItem);
}

if ((isMovie() || isShow()) && imdbId || isList()) {
	parseOptions().then(() => {
		if (isMovie()) {
			initPlexMovie();
		} else if (isShow()) {
			initPlexShow();
		} else {
			initList();
		}
	});
}

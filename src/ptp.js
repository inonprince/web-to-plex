/* global wait, modifyPlexButton, showNotification, parseOptions, findPlexMedia */
function isMoviePage() {
	const path = window.location.pathname;
	if (!path.startsWith('/torrents.php')) {
		return false;
	}
	return true;
}

function getImdbId() {
	const $link = document.querySelector('#imdb-title-link');
	if ($link) {
		return $link.href.replace('http://www.imdb.com/title/', '').replace(/\/$/, '');
	}
	return null;
}

function init() {
	if (isMoviePage()) {
		wait(() => document.querySelector('.page__main-content'), () => {
			initPlexThingy(isMoviePage());
		});
	}
}

function renderPlexButton() {
	const $actions = document.querySelector('.page__title');
	if (!$actions) {
		console.log('Could not add Plex button.');
		return null;
	}
	const $existingEl = $actions.querySelector('.web-to-plex-button');
	if ($existingEl) {
		return null;
	}
	const el = document.createElement('a');
	el.classList.add('web-to-plex-button');
	$actions.appendChild(el);
	return el;
}

function initPlexThingy() {
	const $button = renderPlexButton();
	if (!$button) {
		return;
	}
	const imdbId = getImdbId();
	fetch('https://api.themoviedb.org/3/find/' + imdbId + '?api_key=' + config.tmdbToken + '&language=en-US&external_source=imdb_id').then(function(resp) {
		return resp.json()
	}).then(function(json) {
		let tmdbId,
			title,
			year;
		if (json && json.movie_results && json.movie_results.length) {
			tmdbId = json.movie_results[0].id;
			title = json.movie_results[0].title;
			year = parseInt(json.movie_results[0].release_date.substr(0, 4));
		}
		if (!tmdbId || !title || !year) {
			modifyPlexButton($button, 'error', 'Could not extract title or year');
			return;
		}
		findPlexMedia({ type: 'movie', title, year, button: $button, imdbId, tmdbId });
	});
}

parseOptions().then(() => {
	window.addEventListener('popstate', init);
	window.addEventListener('pushstate-changed', init);
	init();
});

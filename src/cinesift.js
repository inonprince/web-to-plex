/* global wait, modifyPlexButton, showNotification, parseOptions, findPlexMedia */
function getImdbId(film) {
	const $link = film.querySelector('a[href^="http://www.imdb.com"]');
	if ($link) {
		return $link.href.replace('http://www.imdb.com/title/', '').replace(/\/$/, '');
	}
	return null;
}

function init() {
	let isRunning = false;
	wait(() => document.querySelector('.film'), () => {
		setInterval(() => {
			if (!isRunning) {
				isRunning = true;
				document.querySelectorAll('.film:not(.addContainer)').forEach(initPlexThingy);
				isRunning = false;
			}
		}, 500);
	});
}

function renderPlexButton(film) {
	const $actions = film.querySelector('.posterContainer');
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

function initPlexThingy(film) {
	const $button = renderPlexButton(film);
	if (!$button) {
		return;
	}
	const imdbId = getImdbId(film);
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

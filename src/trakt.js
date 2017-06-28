/* global wait, modifyPlexButton, showNotification, parseOptions, findPlexMedia */
function isMoviePage() {
	const path = window.location.pathname;
	if (!path.startsWith('/movies/')) {
		return false;
	}
	// TODO: e.g. /movies/trending is not really a movie page...
	return true;
}

function isShowPage() {
	const path = window.location.pathname;
	if (!path.startsWith('/shows/')) {
		return false;
	}
	// TODO: e.g. /shows/trending is not really a show page...
	return true;
}

function getImdbId() {
	const $link = document.querySelector('ul.external [href^="http://www.imdb.com/title/tt"]');
	if ($link) {
		return $link.href.replace('http://www.imdb.com/title/', '');
	}
	return null;
}

function init() {
	if (isMoviePage() || isShowPage()) {
		wait(() => document.querySelector('#info-wrapper ul.external'), () => {
			initPlexThingy(isMoviePage() ? 'movie' : 'show');
		});
	}
}

function renderPlexButton() {
	const $actions = document.querySelector('ul.external li:first-child');
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
	$actions.insertBefore(el, $actions.childNodes[0]);
	return el;
}

function initPlexThingy(type) {
	const $button = renderPlexButton();
	if (!$button) {
		return;
	}
	const $title = document.querySelector('.btn-checkin');
	const $year = document.querySelector('.summary .mobile-title .year');
	if (!$title || !$year) {
		modifyPlexButton($button, 'error', 'Could not extract title or year');
		return;
	}
	const title = $title.dataset.topTitle;
	const year = parseInt($year.textContent.trim());
	const imdbId = getImdbId();
	fetch('https://api.themoviedb.org/3/find/' + imdbId + '?api_key=' + config.tmdbToken + '&language=en-US&external_source=imdb_id').then(function(resp) {
		return resp.json()
	}).then(function(json) {
		const tmdbId = (json && json.movie_results && json.movie_results.length) ? json.movie_results[0].id : null;
		findPlexMedia({ type, title, year, button: $button, imdbId, tmdbId });
	})
}

parseOptions().then(() => {
	window.addEventListener('popstate', init);
	window.addEventListener('pushstate-changed', init);
	init();
});

<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	// Helper function to check if a route is active
	function isActive(path) {
		return $page.url.pathname === path;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
</svelte:head>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
	<div class="container-fluid">
		<a class="navbar-brand" href="/">
			<i class="bi bi-bullseye text-danger me-2"></i>
			AWS Uturn AIT
		</a>
		<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
			<span class="navbar-toggler-icon"></span>
		</button>
		<div class="collapse navbar-collapse" id="navbarNav">
			<div class="d-flex gap-2">
				<a 
					class="btn {isActive('/hours') ? 'btn-light' : 'btn-outline-light'} btn-sm" 
					href="/hours"
					aria-current={isActive('/hours') ? 'page' : undefined}
				>
					<i class="bi bi-clock me-1"></i> Hours
				</a>
				<a 
					class="btn {isActive('/forecast') ? 'btn-light' : 'btn-outline-light'} btn-sm" 
					href="/forecast"
					aria-current={isActive('/forecast') ? 'page' : undefined}
				>
					<i class="bi bi-clipboard2-data me-1"></i> Forecasting
				</a>
			</div>
		</div>
	</div>
</nav>

{@render children?.()}

<script>
	import days from './days.js';
	import Modal from './Modal.svelte';

	let modalOpen = false;
</script>

<svelte:head>
	<script src="https://kit.fontawesome.com/a229c5b13d.js" crossorigin="anonymous"></script>
</svelte:head>
<main>
	<p>30 Days Of Javascript</p>
	<span class="menu fas fa-bars" on:click={()=>modalOpen = !modalOpen}></span>
	<div class="main-section">
		{#if modalOpen}
			<Modal />
		{/if}
		<div class="welcome-description">
			30 Days of Javascript yeah buddy
		</div>
	</div>
</main>

<style>
	main {
		text-align: center;
		max-width: 240px;
		position: relative;
	}

	p {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
		margin-block-start: 0;
		margin-block-end: 0;
	}

	.menu {
		position: absolute;
		top: 0;
		left: 0;
		margin-top: 2%;
		margin-left: 2%;
	}

	.main-section{
		display: flex;
	}

	.welcome-description{
		margin-top: 50px;
		height:100%;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
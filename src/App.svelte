<script>
	import days from './days.js';
	import Modal from './Modal.svelte';
	import Home from './day_files/Home.svelte';
	import DayOne from './day_files/DayOne.svelte'
	import { page, modalOpen } from './stores.js';
	let pageNum = 0;

	function openModal(e){
		e.preventDefault();

		modalOpen.update(n => n = true);
	}

	// let modalOpen = false;
</script>

<svelte:head>
	<script src="https://kit.fontawesome.com/a229c5b13d.js" crossorigin="anonymous"></script>
</svelte:head>
<main>
	<p>30 Days Of Javascript</p>
	<span class="menu fas fa-bars" on:click={e => openModal(e)}></span>
	<div class="main-section">
		{#if modalOpen}
			<Modal />
		{/if}
		<div id="home" class="page 0">
			<Home />
		</div>
		<div id="1" class="page 1">
			<DayOne />
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

	.page {
		visibility: hidden;
	}

	#home {
		visibility: visible;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>